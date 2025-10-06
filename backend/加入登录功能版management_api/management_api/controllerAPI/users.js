const { getPool } = require("../database");
const bcrypt = require("bcryptjs");
const { signToken } = require("../middleware/auth");
const { logLoginAttempt, logAccountAction } = require("../audit/audit-logger");

// Toggle verbose auth logging with DEBUG_AUTH=1|true|yes|on
const DEBUG_AUTH = /^(1|true|yes|on)$/i.test(process.env.DEBUG_AUTH || "");
const d = (...args) => DEBUG_AUTH && console.log(...args);
const de = (...args) => DEBUG_AUTH && console.error(...args);

function validGroup(group) {
  return ["superadmin", "admin", "staff"].includes(group);
}

function validStatus(status) {
  return ["active", "inactive"].includes(status);
}

/**
 * POST /api/users
 * body: { user_name, password, user_group, email, real_name?, status?, office_location? }
 */
async function createUser(req, res) {
  const actorUserId = Number(req.jwt?.uid) || 0;
  const {
    user_name,
    password,
    user_group,
    email,
    real_name = null,
    status = "active",
    office_location = null,
  } = req.body || {};

  if (!user_name || !password || !user_group || !email) {
    return res.status(400).json({
      ok: false,
      error: "user_name, password, user_group, email are required",
    });
  }

  if (!validGroup(user_group)) {
    return res
      .status(400)
      .json({ ok: false, error: "user_group must be 'superadmin', 'admin' or 'staff'" });
  }

  if (!validStatus(status)) {
    return res
      .status(400)
      .json({ ok: false, error: "status must be 'active' or 'inactive'" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const normalizedRealName =
      typeof real_name === "string" && real_name.trim() ? real_name.trim() : null;
    const normalizedOffice =
      typeof office_location === "string" && office_location.trim() ? office_location.trim() : null;
    const conn = await getPool("orders").getConnection();

    try {
      const [result] = await conn.query(
        "INSERT INTO users (user_name, user_password, user_group, real_name, email, status, office_location) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [user_name, hash, user_group, normalizedRealName, email, status, normalizedOffice]
      );

      await logAccountAction({
        req,
        actorUserId,
        targetUserId: result.insertId,
        crudOperation: 'CREATE',
        description: `Created user ${user_name} (#${result.insertId})`,
      });

      res.json({ ok: true, user_id: result.insertId });
    } catch (err) {
      if (err && err.code === "ER_DUP_ENTRY") {
        await logAccountAction({
          req,
          actorUserId,
          crudOperation: 'CREATE',
          description: `Failed to create user ${user_name}: duplicate email`,
        });
        return res.status(409).json({ ok: false, error: "email already exists" });
      }

      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    await logAccountAction({
      req,
      actorUserId,
      crudOperation: 'CREATE',
      description: `Error creating user ${user_name}: ${err.message}`,
    });
    res.status(500).json({ ok: false, error: err.message });
  }
}
/**
 * DELETE /api/users/:id
 */
async function deleteUser(req, res) {
  const actorUserId = Number(req.jwt?.uid) || 0;
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId required" });
  }

  try {
    const conn = await getPool("orders").getConnection();

    try {
      const [[superadminCount]] = await conn.query(
        "SELECT COUNT(*) AS c FROM users WHERE user_group='superadmin'"
      );
      const [[target]] = await conn.query(
        "SELECT user_group FROM users WHERE user_id=?",
        [userId]
      );

      if (!target) {
        await logAccountAction({
          req,
          actorUserId,
          targetUserId: userId,
          crudOperation: 'DELETE',
          description: `Attempted to delete user ${userId} but user does not exist`,
        });
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      if (target.user_group === "superadmin" && superadminCount.c <= 1) {
        await logAccountAction({
          req,
          actorUserId,
          targetUserId: userId,
          crudOperation: 'DELETE',
          description: `Blocked deletion of the last superadmin (${userId})`,
        });
        return res
          .status(400)
          .json({ ok: false, error: "cannot delete the last superadmin" });
      }

      const [result] = await conn.query("DELETE FROM users WHERE user_id=?", [
        userId,
      ]);

      if (result.affectedRows === 0) {
        await logAccountAction({
          req,
          actorUserId,
          targetUserId: userId,
          crudOperation: 'DELETE',
          description: `Attempted to delete user ${userId} but no rows were affected`,
        });
      } else {
        await logAccountAction({
          req,
          actorUserId,
          targetUserId: userId,
          crudOperation: 'DELETE',
          description: `Deleted user ${userId}`,
        });
      }

      res.json({ ok: true, affectedRows: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (err) {
    await logAccountAction({
      req,
      actorUserId,
      targetUserId: userId,
      crudOperation: 'DELETE',
      description: `Error deleting user ${userId}: ${err.message}`,
    });
    res.status(500).json({ ok: false, error: err.message });
  }
}
/**
 * POST /api/login
 * body: { login, password }
 */
async function login(req, res) {
  const { login, password } = req.body || {};

  if (!login || !password) {
    await logLoginAttempt({
      req,
      actorUserId: 0,
      success: false,
      description: 'Login attempt with missing credentials',
    });
    return res
      .status(400)
      .json({ ok: false, error: "login and password are required" });
  }

  try {
    const conn = await getPool("orders").getConnection();

    try {
      if (DEBUG_AUTH) {
        const [[db]] = await conn.query("SELECT DATABASE() AS db");
        d("[DB] using schema:", db.db);
      }

      const sql = `
        SELECT user_id, user_name, email, user_password, user_group,
               real_name, status, office_location
          FROM users
         WHERE user_name = ? OR email = ?
         LIMIT 1
      `;

      d("[SQL]", sql.trim(), "-- params:", [login, login]);

      const [[user]] = await conn.query(sql, [login, login]);
      d("[SQL] result keys:", user ? Object.keys(user) : user);

      if (!user) {
        await logLoginAttempt({
          req,
          actorUserId: 0,
          success: false,
          description: `Login failed for \"${login}\": user not found`,
        });
        return res
          .status(401)
          .json({ ok: false, error: "invalid credentials" });
      }

      if (user.status === "inactive") {
        await logLoginAttempt({
          req,
          actorUserId: user.user_id,
          success: false,
          description: `Login rejected for inactive account ${user.user_id}`,
        });
        return res
          .status(403)
          .json({ ok: false, error: "account inactive" });
      }

      const match = await bcrypt.compare(password, user.user_password);
      d("[LOGIN] password compare:", match);

      if (!match) {
        await logLoginAttempt({
          req,
          actorUserId: user.user_id,
          success: false,
          description: `Login failed for user_id ${user.user_id}: incorrect password`,
        });
        return res
          .status(401)
          .json({ ok: false, error: "invalid credentials" });
      }

      const token = signToken({ uid: user.user_id, role: user.user_group });
      delete user.user_password;

      await logLoginAttempt({
        req,
        actorUserId: user.user_id,
        success: true,
        description: `Login success for user_id ${user.user_id}`,
      });

      res.json({
        ok: true,
        token,
        expires_in: 60 * 60 * 12,
        user,
      });
    } finally {
      conn.release();
    }
  } catch (err) {
    de("[LOGIN] error:", err);
    await logLoginAttempt({
      req,
      actorUserId: 0,
      success: false,
      description: `Login error for \"${login}\": ${err.message}`,
    });
    res.status(500).json({ ok: false, error: err.message });
  }
}
/**
 * PUT /api/users/:id
 * body: { user_name, user_group, email, real_name?, status?, office_location? }
 */
async function updateUser(req, res) {
  const actorUserId = Number(req.jwt?.uid) || 0;
  const userId = Number(req.params.id);
  const {
    user_name,
    user_group,
    email,
    real_name = null,
    status,
    office_location = null,
  } = req.body || {};

  if (!userId || !user_name || !user_group || !email || !status) {
    return res.status(400).json({
      ok: false,
      error: "userId, user_name, user_group, email and status are required",
    });
  }

  if (!validGroup(user_group)) {
    return res
      .status(400)
      .json({ ok: false, error: "user_group must be 'superadmin', 'admin' or 'staff'" });
  }

  if (!validStatus(status)) {
    return res
      .status(400)
      .json({ ok: false, error: "status must be 'active' or 'inactive'" });
  }

  const normalizedRealName =
    typeof real_name === "string" && real_name.trim() ? real_name.trim() : null;
  const normalizedOffice =
    typeof office_location === "string" && office_location.trim() ? office_location.trim() : null;

  try {
    const conn = await getPool("orders").getConnection();

    try {
      const [result] = await conn.query(
        "UPDATE users SET user_name=?, user_group=?, real_name=?, email=?, status=?, office_location=? WHERE user_id=?",
        [
          user_name,
          user_group,
          normalizedRealName,
          email,
          status,
          normalizedOffice,
          userId,
        ]
      );

      if (result.affectedRows === 0) {
        await logAccountAction({
          req,
          actorUserId,
          targetUserId: userId,
          crudOperation: 'UPDATE',
          description: `Attempted to update user ${userId} but user not found`,
        });
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      await logAccountAction({
        req,
        actorUserId,
        targetUserId: userId,
        crudOperation: 'UPDATE',
        description: `Updated user ${userId}`,
      });

      res.json({ ok: true, affectedRows: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (err) {
    await logAccountAction({
      req,
      actorUserId,
      targetUserId: userId,
      crudOperation: 'UPDATE',
      description: `Error updating user ${userId}: ${err.message}`,
    });
    res.status(500).json({ ok: false, error: err.message });
  }
}
/**
 * PUT /api/users/:id/status
 * body: { status }
 */
async function updateStatus(req, res) {
  const actorUserId = Number(req.jwt?.uid) || 0;
  const userId = Number(req.params.id);
  const { status } = req.body || {};

  if (!userId || !status) {
    return res
      .status(400)
      .json({ ok: false, error: "userId and status are required" });
  }

  if (!validStatus(status)) {
    return res
      .status(400)
      .json({ ok: false, error: "status must be 'active' or 'inactive'" });
  }

  try {
    const conn = await getPool("orders").getConnection();

    try {
      const [result] = await conn.query(
        "UPDATE users SET status=? WHERE user_id=?",
        [status, userId]
      );

      if (result.affectedRows === 0) {
        await logAccountAction({
          req,
          actorUserId,
          targetUserId: userId,
          crudOperation: 'UPDATE',
          description: `Attempted to update status for user ${userId} but user not found`,
        });
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      await logAccountAction({
        req,
        actorUserId,
        targetUserId: userId,
        crudOperation: 'UPDATE',
        description: `Updated status to ${status} for user ${userId}`,
      });

      res.json({ ok: true, affectedRows: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (err) {
    await logAccountAction({
      req,
      actorUserId,
      targetUserId: userId,
      crudOperation: 'UPDATE',
      description: `Error updating status for user ${userId}: ${err.message}`,
    });
    res.status(500).json({ ok: false, error: err.message });
  }
}
/**
 * PUT /api/users/:id/password
 * body: { password }
 */
async function resetPassword(req, res) {
  const actorUserId = Number(req.jwt?.uid) || 0;
  const userId = Number(req.params.id);
  const { password } = req.body || {};

  if (!userId || !password) {
    return res
      .status(400)
      .json({ ok: false, error: "userId and password are required" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const conn = await getPool("orders").getConnection();

    try {
      const [result] = await conn.query(
        "UPDATE users SET user_password=? WHERE user_id=?",
        [hash, userId]
      );

      if (result.affectedRows === 0) {
        await logAccountAction({
          req,
          actorUserId,
          targetUserId: userId,
          crudOperation: 'UPDATE',
          description: `Attempted to reset password for user ${userId} but user not found`,
        });
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      await logAccountAction({
        req,
        actorUserId,
        targetUserId: userId,
        crudOperation: 'UPDATE',
        description: `Reset password for user ${userId}`,
      });

      res.json({ ok: true, affectedRows: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (err) {
    await logAccountAction({
      req,
      actorUserId,
      targetUserId: userId,
      crudOperation: 'UPDATE',
      description: `Error resetting password for user ${userId}: ${err.message}`,
    });
    res.status(500).json({ ok: false, error: err.message });
  }
}
/**
 * GET /api/users
 */
async function listUsers(req, res) {
  try {
    const conn = await getPool("orders").getConnection();

    try {
      const [rows] = await conn.query(
        "SELECT user_id, user_name, user_group, real_name, email, status, office_location FROM users ORDER BY user_id ASC"
      );

      res.json({ ok: true, data: rows });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * GET /api/users/:id
 */
async function getUser(req, res) {
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId required" });
  }

  try {
    const conn = await getPool("orders").getConnection();

    try {
      const [rows] = await conn.query(
        "SELECT user_id, user_name, user_group, real_name, email, status, office_location FROM users WHERE user_id=?",
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      res.json({ ok: true, data: rows[0] });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  createUser,
  deleteUser,
  login,
  updateUser,
  updateStatus,
  resetPassword,
  listUsers,
  getUser,
};

