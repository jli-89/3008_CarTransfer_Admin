const { getPool } = require("../database");
const bcrypt = require("bcryptjs");
const { signToken } = require("../middleware/auth");

// Toggle verbose auth logging with DEBUG_AUTH=1|true|yes|on
const DEBUG_AUTH = /^(1|true|yes|on)$/i.test(process.env.DEBUG_AUTH || "");
const d = (...args) => DEBUG_AUTH && console.log(...args);
const de = (...args) => DEBUG_AUTH && console.error(...args);

function validGroup(group) {
  return ["admin", "staff"].includes(group);
}

function validStatus(status) {
  return ["active", "inactive"].includes(status);
}

/**
 * POST /api/users
 * body: { user_name, password, user_group, email, real_name?, status? }
 */
async function createUser(req, res) {
  const {
    user_name,
    password,
    user_group,
    email,
    real_name = null,
    status = "active",
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
      .json({ ok: false, error: "user_group must be 'admin' or 'staff'" });
  }

  if (!validStatus(status)) {
    return res
      .status(400)
      .json({ ok: false, error: "status must be 'active' or 'inactive'" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const conn = await getPool("orders").getConnection();

    try {
      const [result] = await conn.query(
        "INSERT INTO users (user_name, user_password, user_group, real_name, email, status) VALUES (?, ?, ?, ?, ?, ?)",
        [user_name, hash, user_group, real_name, email, status]
      );

      res.json({ ok: true, user_id: result.insertId });
    } catch (err) {
      if (err && err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ ok: false, error: "email already exists" });
      }

      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * DELETE /api/users/:id
 */
async function deleteUser(req, res) {
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId required" });
  }

  try {
    const conn = await getPool("orders").getConnection();

    try {
      const [[adminCount]] = await conn.query(
        "SELECT COUNT(*) AS c FROM users WHERE user_group='admin'"
      );
      const [[target]] = await conn.query(
        "SELECT user_group FROM users WHERE user_id=?",
        [userId]
      );

      if (!target) {
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      if (target.user_group === "admin" && adminCount.c <= 1) {
        return res
          .status(400)
          .json({ ok: false, error: "cannot delete the last admin" });
      }

      const [result] = await conn.query("DELETE FROM users WHERE user_id=?", [
        userId,
      ]);

      res.json({ ok: true, affectedRows: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (err) {
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
               real_name, status
          FROM users
         WHERE user_name = ? OR email = ?
         LIMIT 1
      `;

      d("[SQL]", sql.trim(), "-- params:", [login, login]);

      const [[user]] = await conn.query(sql, [login, login]);
      d("[SQL] result keys:", user ? Object.keys(user) : user);

      if (!user) {
        return res
          .status(401)
          .json({ ok: false, error: "invalid credentials" });
      }

      if (user.status === "inactive") {
        return res
          .status(403)
          .json({ ok: false, error: "account inactive" });
      }

      const match = await bcrypt.compare(password, user.user_password);
      d("[LOGIN] password compare:", match);

      if (!match) {
        return res
          .status(401)
          .json({ ok: false, error: "invalid credentials" });
      }

      const token = signToken({ uid: user.user_id, role: user.user_group });
      delete user.user_password;

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
    res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * PUT /api/users/:id/status
 * body: { status }
 */
async function updateStatus(req, res) {
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

      res.json({ ok: true, affectedRows: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * PUT /api/users/:id/password
 * body: { password }
 */
async function resetPassword(req, res) {
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

      res.json({ ok: true, affectedRows: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (err) {
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
        "SELECT user_id, user_name, user_group, real_name, email, status FROM users ORDER BY user_id ASC"
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
        "SELECT user_id, user_name, user_group, real_name, email, status FROM users WHERE user_id=?",
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
  updateStatus,
  resetPassword,
  listUsers,
  getUser,
};

