// // const { getPool } = require("../database");
// // const bcrypt = require("bcryptjs");
// // const { signToken } = require("../middleware/auth");

// // // Toggle verbose auth logging with DEBUG_AUTH=1|true|yes|on
// // const DEBUG_AUTH = /^(1|true|yes|on)$/i.test(process.env.DEBUG_AUTH || "");
// // const d = (...args) => DEBUG_AUTH && console.log(...args);
// // const de = (...args) => DEBUG_AUTH && console.error(...args);

// // function validGroup(group) {
// //   return ["superadmin", "admin", "staff"].includes(group);
// // }

// // function validStatus(status) {
// //   return ["active", "inactive"].includes(status);
// // }

// // /**
// //  * POST /api/users
// //  * body: { user_name, password, user_group, email, real_name?, status?, office_location? }
// //  */
// // async function createUser(req, res) {
// //   const {
// //     user_name,
// //     password,
// //     user_group,
// //     email,
// //     real_name = null,
// //     status = "active",
// //     office_location = null,
// //   } = req.body || {};

// //   if (!user_name || !password || !user_group || !email) {
// //     return res.status(400).json({
// //       ok: false,
// //       error: "user_name, password, user_group, email are required",
// //     });
// //   }

// //   if (!validGroup(user_group)) {
// //     return res
// //       .status(400)
// //       .json({ ok: false, error: "user_group must be 'superadmin', 'admin' or 'staff'" });
// //   }

// //   if (!validStatus(status)) {
// //     return res
// //       .status(400)
// //       .json({ ok: false, error: "status must be 'active' or 'inactive'" });
// //   }

// //   try {
// //     const hash = await bcrypt.hash(password, 10);
// //     const normalizedRealName =
// //       typeof real_name === "string" && real_name.trim() ? real_name.trim() : null;
// //     const normalizedOffice =
// //       typeof office_location === "string" && office_location.trim() ? office_location.trim() : null;
// //     const conn = await getPool("orders").getConnection();

// //     try {
// //       const [result] = await conn.query(
// //         "INSERT INTO users (user_name, user_password, user_group, real_name, email, status, office_location) VALUES (?, ?, ?, ?, ?, ?, ?)",
// //         [user_name, hash, user_group, normalizedRealName, email, status, normalizedOffice]
// //       );

// //       res.json({ ok: true, user_id: result.insertId });
// //     } catch (err) {
// //       if (err && err.code === "ER_DUP_ENTRY") {
// //         return res.status(409).json({ ok: false, error: "email already exists" });
// //       }

// //       throw err;
// //     } finally {
// //       conn.release();
// //     }
// //   } catch (err) {
// //     res.status(500).json({ ok: false, error: err.message });
// //   }
// // }

// // /**
// //  * DELETE /api/users/:id
// //  */
// // async function deleteUser(req, res) {
// //   const userId = Number(req.params.id);

// //   if (!userId) {
// //     return res.status(400).json({ ok: false, error: "userId required" });
// //   }

// //   try {
// //     const conn = await getPool("orders").getConnection();

// //     try {
// //       const [[superadminCount]] = await conn.query(
// //         "SELECT COUNT(*) AS c FROM users WHERE user_group='superadmin'"
// //       );
// //       const [[target]] = await conn.query(
// //         "SELECT user_group FROM users WHERE user_id=?",
// //         [userId]
// //       );

// //       if (!target) {
// //         return res.status(404).json({ ok: false, error: "user not found" });
// //       }

// //       if (target.user_group === "superadmin" && superadminCount.c <= 1) {
// //         return res
// //           .status(400)
// //           .json({ ok: false, error: "cannot delete the last superadmin" });
// //       }

// //       const [result] = await conn.query("DELETE FROM users WHERE user_id=?", [
// //         userId,
// //       ]);

// //       res.json({ ok: true, affectedRows: result.affectedRows });
// //     } finally {
// //       conn.release();
// //     }
// //   } catch (err) {
// //     res.status(500).json({ ok: false, error: err.message });
// //   }
// // }

// // /**
// //  * POST /api/login
// //  * body: { login, password }
// //  */
// // async function login(req, res) {
// //   const { login, password } = req.body || {};

// //   if (!login || !password) {
// //     return res
// //       .status(400)
// //       .json({ ok: false, error: "login and password are required" });
// //   }

// //   try {
// //     const conn = await getPool("orders").getConnection();

// //     try {
// //       if (DEBUG_AUTH) {
// //         const [[db]] = await conn.query("SELECT DATABASE() AS db");
// //         d("[DB] using schema:", db.db);
// //       }

// //       const sql = `
// //         SELECT user_id, user_name, email, user_password, user_group,
// //                real_name, status, office_location
// //           FROM users
// //          WHERE user_name = ? OR email = ?
// //          LIMIT 1
// //       `;

// //       d("[SQL]", sql.trim(), "-- params:", [login, login]);

// //       const [[user]] = await conn.query(sql, [login, login]);
// //       d("[SQL] result keys:", user ? Object.keys(user) : user);

// //       if (!user) {
// //         return res
// //           .status(401)
// //           .json({ ok: false, error: "invalid credentials" });
// //       }

// //       if (user.status === "inactive") {
// //         return res
// //           .status(403)
// //           .json({ ok: false, error: "account inactive" });
// //       }

// //       const match = await bcrypt.compare(password, user.user_password);
// //       d("[LOGIN] password compare:", match);

// //       if (!match) {
// //         return res
// //           .status(401)
// //           .json({ ok: false, error: "invalid credentials" });
// //       }

// //       const token = signToken({ uid: user.user_id, role: user.user_group });
// //       delete user.user_password;

// //       res.json({
// //         ok: true,
// //         token,
// //         expires_in: 60 * 60 * 12,
// //         user,
// //       });
// //     } finally {
// //       conn.release();
// //     }
// //   } catch (err) {
// //     de("[LOGIN] error:", err);
// //     res.status(500).json({ ok: false, error: err.message });
// //   }
// // }

// // /**
// //  * PUT /api/users/:id
// //  * body: { user_name, user_group, email, real_name?, status?, office_location? }
// //  */
// // async function updateUser(req, res) {
// //   const userId = Number(req.params.id);
// //   const {
// //     user_name,
// //     user_group,
// //     email,
// //     real_name = null,
// //     status,
// //     office_location = null,
// //   } = req.body || {};

// //   if (!userId || !user_name || !user_group || !email || !status) {
// //     return res.status(400).json({
// //       ok: false,
// //       error: "userId, user_name, user_group, email and status are required",
// //     });
// //   }

// //   if (!validGroup(user_group)) {
// //     return res
// //       .status(400)
// //       .json({ ok: false, error: "user_group must be 'superadmin', 'admin' or 'staff'" });
// //   }

// //   if (!validStatus(status)) {
// //     return res
// //       .status(400)
// //       .json({ ok: false, error: "status must be 'active' or 'inactive'" });
// //   }

// //   const normalizedRealName =
// //     typeof real_name === "string" && real_name.trim() ? real_name.trim() : null;
// //   const normalizedOffice =
// //     typeof office_location === "string" && office_location.trim() ? office_location.trim() : null;

// //   try {
// //     const conn = await getPool("orders").getConnection();

// //     try {
// //       const [result] = await conn.query(
// //         "UPDATE users SET user_name=?, user_group=?, real_name=?, email=?, status=?, office_location=? WHERE user_id=?",
// //         [
// //           user_name,
// //           user_group,
// //           normalizedRealName,
// //           email,
// //           status,
// //           normalizedOffice,
// //           userId,
// //         ]
// //       );

// //       if (result.affectedRows === 0) {
// //         return res.status(404).json({ ok: false, error: "user not found" });
// //       }

// //       res.json({ ok: true, affectedRows: result.affectedRows });
// //     } catch (err) {
// //       if (err && err.code === "ER_DUP_ENTRY") {
// //         return res.status(409).json({ ok: false, error: "email already exists" });
// //       }

// //       throw err;
// //     } finally {
// //       conn.release();
// //     }
// //   } catch (err) {
// //     res.status(500).json({ ok: false, error: err.message });
// //   }
// // }

// // /**
// //  * PUT /api/users/:id/status
// //  * body: { status }
// //  */
// // async function updateStatus(req, res) {
// //   const userId = Number(req.params.id);
// //   const { status } = req.body || {};

// //   if (!userId || !status) {
// //     return res
// //       .status(400)
// //       .json({ ok: false, error: "userId and status are required" });
// //   }

// //   if (!validStatus(status)) {
// //     return res
// //       .status(400)
// //       .json({ ok: false, error: "status must be 'active' or 'inactive'" });
// //   }

// //   try {
// //     const conn = await getPool("orders").getConnection();

// //     try {
// //       const [result] = await conn.query(
// //         "UPDATE users SET status=? WHERE user_id=?",
// //         [status, userId]
// //       );

// //       res.json({ ok: true, affectedRows: result.affectedRows });
// //     } finally {
// //       conn.release();
// //     }
// //   } catch (err) {
// //     res.status(500).json({ ok: false, error: err.message });
// //   }
// // }

// // /**
// //  * PUT /api/users/:id/password
// //  * body: { password }
// //  */
// // async function resetPassword(req, res) {
// //   const userId = Number(req.params.id);
// //   const { password } = req.body || {};

// //   if (!userId || !password) {
// //     return res
// //       .status(400)
// //       .json({ ok: false, error: "userId and password are required" });
// //   }

// //   try {
// //     const hash = await bcrypt.hash(password, 10);
// //     const conn = await getPool("orders").getConnection();

// //     try {
// //       const [result] = await conn.query(
// //         "UPDATE users SET user_password=? WHERE user_id=?",
// //         [hash, userId]
// //       );

// //       res.json({ ok: true, affectedRows: result.affectedRows });
// //     } finally {
// //       conn.release();
// //     }
// //   } catch (err) {
// //     res.status(500).json({ ok: false, error: err.message });
// //   }
// // }

// // /**
// //  * GET /api/users
// //  */
// // async function listUsers(req, res) {
// //   try {
// //     const conn = await getPool("orders").getConnection();

// //     try {
// //       const [rows] = await conn.query(
// //         "SELECT user_id, user_name, user_group, real_name, email, status, office_location FROM users ORDER BY user_id ASC"
// //       );

// //       res.json({ ok: true, data: rows });
// //     } finally {
// //       conn.release();
// //     }
// //   } catch (err) {
// //     res.status(500).json({ ok: false, error: err.message });
// //   }
// // }

// // /**
// //  * GET /api/users/:id
// //  */
// // async function getUser(req, res) {
// //   const userId = Number(req.params.id);

// //   if (!userId) {
// //     return res.status(400).json({ ok: false, error: "userId required" });
// //   }

// //   try {
// //     const conn = await getPool("orders").getConnection();

// //     try {
// //       const [rows] = await conn.query(
// //         "SELECT user_id, user_name, user_group, real_name, email, status, office_location FROM users WHERE user_id=?",
// //         [userId]
// //       );

// //       if (rows.length === 0) {
// //         return res.status(404).json({ ok: false, error: "user not found" });
// //       }

// //       res.json({ ok: true, data: rows[0] });
// //     } finally {
// //       conn.release();
// //     }
// //   } catch (err) {
// //     res.status(500).json({ ok: false, error: err.message });
// //   }
// // }

// // const { logAccountAction } = require("../audit/audit-logger");

// // logAccountAction({
// //   actor_user_id: req.user?.user_id,     // 執行者
// //   target_user_id: Number(req.params.id),// 被操作對象
// //   operation: "UPDATE",                  // CREATE / READ / UPDATE / DELETE
// //   description: "admin update user profile",
// //   ip: (req.headers["x-forwarded-for"]||"").split(",")[0] || req.socket?.remoteAddress || "",
// //   ua: req.get("user-agent") || ""
// // })


// // module.exports = {
// //   createUser,
// //   deleteUser,
// //   login,
// //   updateUser,
// //   updateStatus,
// //   resetPassword,
// //   listUsers,
// //   getUser,
// // };









// const { getPool } = require("../database");
// const bcrypt = require("bcryptjs");
// const { signToken } = require("../middleware/auth");
// const { logLoginAttempt, logAccountAction } = require("../audit/audit-logger");

// // Toggle verbose auth logging with DEBUG_AUTH=1|true|yes|on
// const DEBUG_AUTH = /^(1|true|yes|on)$/i.test(process.env.DEBUG_AUTH || "");
// const d  = (...args) => DEBUG_AUTH && console.log(...args);
// const de = (...args) => DEBUG_AUTH && console.error(...args);

// function validGroup(group) {
//   return ["superadmin", "admin", "staff"].includes(group);
// }

// function validStatus(status) {
//   return ["active", "inactive"].includes(status);
// }

// /**
//  * POST /api/users
//  * body: { user_name, password, user_group, email, real_name?, status?, office_location? }
//  */
// async function createUser(req, res) {
//   const {
//     user_name,
//     password,
//     user_group,
//     email,
//     real_name = null,
//     status = "active",
//     office_location = null,
//   } = req.body || {};

//   if (!user_name || !password || !user_group || !email) {
//     return res.status(400).json({
//       ok: false,
//       error: "user_name, password, user_group, email are required",
//     });
//   }

//   if (!validGroup(user_group)) {
//     return res
//       .status(400)
//       .json({ ok: false, error: "user_group must be 'superadmin', 'admin' or 'staff'" });
//   }

//   if (!validStatus(status)) {
//     return res
//       .status(400)
//       .json({ ok: false, error: "status must be 'active' or 'inactive'" });
//   }

//   try {
//     const hash = await bcrypt.hash(password, 10);
//     const normalizedRealName =
//       typeof real_name === "string" && real_name.trim() ? real_name.trim() : null;
//     const normalizedOffice =
//       typeof office_location === "string" && office_location.trim() ? office_location.trim() : null;
//     const conn = await getPool("orders").getConnection();

//     try {
//       const [result] = await conn.query(
//         "INSERT INTO users (user_name, user_password, user_group, real_name, email, status, office_location) VALUES (?, ?, ?, ?, ?, ?, ?)",
//         [user_name, hash, user_group, normalizedRealName, email, status, normalizedOffice]
//       );

//       // 審計：建立帳號
//       try {
//         await logAccountAction({
//           req,
//           actorUserId : Number(req.jwt?.uid) || 0,
//           targetUserId: Number(result.insertId) || null,
//           crudOperation: "CREATE",
//           description : `create user ${user_name}`,
//         });
//       } catch (e) { de("[AUDIT][createUser] err:", e); }

//       res.json({ ok: true, user_id: result.insertId });
//     } catch (err) {
//       if (err && err.code === "ER_DUP_ENTRY") {
//         return res.status(409).json({ ok: false, error: "email already exists" });
//       }
//       throw err;
//     } finally {
//       conn.release();
//     }
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// }

// /**
//  * DELETE /api/users/:id
//  */
// async function deleteUser(req, res) {
//   const userId = Number(req.params.id);

//   if (!userId) {
//     return res.status(400).json({ ok: false, error: "userId required" });
//   }

//   try {
//     const conn = await getPool("orders").getConnection();

//     try {
//       const [[superadminCount]] = await conn.query(
//         "SELECT COUNT(*) AS c FROM users WHERE user_group='superadmin'"
//       );
//       const [[target]] = await conn.query(
//         "SELECT user_group, user_name FROM users WHERE user_id=?",
//         [userId]
//       );

//       if (!target) {
//         return res.status(404).json({ ok: false, error: "user not found" });
//       }

//       if (target.user_group === "superadmin" && superadminCount.c <= 1) {
//         return res
//           .status(400)
//           .json({ ok: false, error: "cannot delete the last superadmin" });
//       }

//       const [result] = await conn.query("DELETE FROM users WHERE user_id=?", [userId]);

//       // 審計：刪除帳號
//       try {
//         await logAccountAction({
//           req,
//           actorUserId : Number(req.jwt?.uid) || 0,
//           targetUserId: userId,
//           crudOperation: "DELETE",
//           description : `delete user ${target.user_name}`,
//         });
//       } catch (e) { de("[AUDIT][deleteUser] err:", e); }

//       res.json({ ok: true, affectedRows: result.affectedRows });
//     } finally {
//       conn.release();
//     }
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// }

// /**
//  * POST /api/login
//  * body: { login, password }
//  */
// async function login(req, res) {
//   const { login, password } = req.body || {};

//   if (!login || !password) {
//     return res.status(400).json({ ok: false, error: "login and password are required" });
//   }

//   try {
//     const conn = await getPool("orders").getConnection();

//     try {
//       if (DEBUG_AUTH) {
//         const [[db]] = await conn.query("SELECT DATABASE() AS db");
//         d("[DB] using schema:", db.db);
//       }

//       const sql = `
//         SELECT user_id, user_name, email, user_password, user_group,
//                real_name, status, office_location
//           FROM users
//          WHERE user_name = ? OR email = ?
//          LIMIT 1
//       `;

//       d("[SQL]", sql.trim(), "-- params:", [login, login]);

//       const [[user]] = await conn.query(sql, [login, login]);
//       d("[SQL] result keys:", user ? Object.keys(user) : user);

//       if (!user) {
//         try {
//           await logLoginAttempt({
//             req,
//             actorUserId: 0,
//             success: false,
//             description: "invalid credentials (user not found)",
//           });
//         } catch (e) { de("[AUDIT][login:!user] err:", e); }

//         return res.status(401).json({ ok: false, error: "invalid credentials" });
//       }

//       if (user.status === "inactive") {
//         try {
//           await logLoginAttempt({
//             req,
//             actorUserId: Number(user.user_id) || 0,
//             success: false,
//             description: "account inactive",
//           });
//         } catch (e) { de("[AUDIT][login:inactive] err:", e); }

//         return res.status(403).json({ ok: false, error: "account inactive" });
//       }

//       const match = await bcrypt.compare(password, user.user_password);
//       d("[LOGIN] password compare:", match);

//       if (!match) {
//         try {
//           await logLoginAttempt({
//             req,
//             actorUserId: Number(user.user_id) || 0,
//             success: false,
//             description: "invalid credentials (password mismatch)",
//           });
//         } catch (e) { de("[AUDIT][login:badpass] err:", e); }

//         return res.status(401).json({ ok: false, error: "invalid credentials" });
//       }

//       const token = signToken({ uid: user.user_id, role: user.user_group });
//       delete user.user_password;

//       try {
//         await logLoginAttempt({
//           req,
//           actorUserId: Number(user.user_id) || 0,
//           success: true,
//           description: "login ok",
//         });
//       } catch (e) { de("[AUDIT][login:ok] err:", e); }

//       res.json({
//         ok: true,
//         token,
//         expires_in: 60 * 60 * 12,
//         user,
//       });
//     } finally {
//       conn.release();
//     }
//   } catch (err) {
//     de("[LOGIN] error:", err);
//     res.status(500).json({ ok: false, error: err.message });
//   }
// }

// /**
//  * PUT /api/users/:id
//  * body: { user_name, user_group, email, real_name?, status?, office_location? }
//  */
// async function updateUser(req, res) {
//   const userId = Number(req.params.id);
//   const {
//     user_name,
//     user_group,
//     email,
//     real_name = null,
//     status,
//     office_location = null,
//   } = req.body || {};

//   if (!userId || !user_name || !user_group || !email || !status) {
//     return res.status(400).json({
//       ok: false,
//       error: "userId, user_name, user_group, email and status are required",
//     });
//   }

//   if (!validGroup(user_group)) {
//     return res
//       .status(400)
//       .json({ ok: false, error: "user_group must be 'superadmin', 'admin' or 'staff'" });
//   }

//   if (!validStatus(status)) {
//     return res
//       .status(400)
//       .json({ ok: false, error: "status must be 'active' or 'inactive'" });
//   }

//   const normalizedRealName =
//     typeof real_name === "string" && real_name.trim() ? real_name.trim() : null;
//   const normalizedOffice =
//     typeof office_location === "string" && office_location.trim() ? office_location.trim() : null;

//   try {
//     const conn = await getPool("orders").getConnection();

//     try {
//       const [result] = await conn.query(
//         "UPDATE users SET user_name=?, user_group=?, real_name=?, email=?, status=?, office_location=? WHERE user_id=?",
//         [
//           user_name,
//           user_group,
//           normalizedRealName,
//           email,
//           status,
//           normalizedOffice,
//           userId,
//         ]
//       );

//       if (result.affectedRows === 0) {
//         return res.status(404).json({ ok: false, error: "user not found" });
//       }

//       // 審計：更新帳號
//       try {
//         await logAccountAction({
//           req,
//           actorUserId : Number(req.jwt?.uid) || 0,
//           targetUserId: userId,
//           crudOperation: "UPDATE",
//           description : `update user ${user_name}`,
//         });
//       } catch (e) { de("[AUDIT][updateUser] err:", e); }

//       res.json({ ok: true, affectedRows: result.affectedRows });
//     } catch (err) {
//       if (err && err.code === "ER_DUP_ENTRY") {
//         return res.status(409).json({ ok: false, error: "email already exists" });
//       }
//       throw err;
//     } finally {
//       conn.release();
//     }
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// }

// /**
//  * PUT /api/users/:id/status
//  * body: { status }
//  */
// async function updateStatus(req, res) {
//   const userId = Number(req.params.id);
//   const { status } = req.body || {};

//   if (!userId || !status) {
//     return res.status(400).json({ ok: false, error: "userId and status are required" });
//   }

//   if (!validStatus(status)) {
//     return res
//       .status(400)
//       .json({ ok: false, error: "status must be 'active' or 'inactive'" });
//   }

//   try {
//     const conn = await getPool("orders").getConnection();

//     try {
//       const [result] = await conn.query(
//         "UPDATE users SET status=? WHERE user_id=?",
//         [status, userId]
//       );

//       // 審計：更新帳號狀態
//       try {
//         await logAccountAction({
//           req,
//           actorUserId : Number(req.jwt?.uid) || 0,
//           targetUserId: userId,
//           crudOperation: "UPDATE",
//           description : `update user status -> ${status}`,
//         });
//       } catch (e) { de("[AUDIT][updateStatus] err:", e); }

//       res.json({ ok: true, affectedRows: result.affectedRows });
//     } finally {
//       conn.release();
//     }
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// }

// /**
//  * PUT /api/users/:id/password
//  * body: { password }
//  */
// async function resetPassword(req, res) {
//   const userId = Number(req.params.id);
//   const { password } = req.body || {};

//   if (!userId || !password) {
//     return res.status(400).json({ ok: false, error: "userId and password are required" });
//   }

//   try {
//     const hash = await bcrypt.hash(password, 10);
//     const conn = await getPool("orders").getConnection();

//     try {
//       const [result] = await conn.query(
//         "UPDATE users SET user_password=? WHERE user_id=?",
//         [hash, userId]
//       );

//       // 審計：重設密碼
//       try {
//         await logAccountAction({
//           req,
//           actorUserId : Number(req.jwt?.uid) || 0,
//           targetUserId: userId,
//           crudOperation: "UPDATE",
//           description : "reset user password",
//         });
//       } catch (e) { de("[AUDIT][resetPassword] err:", e); }

//       res.json({ ok: true, affectedRows: result.affectedRows });
//     } finally {
//       conn.release();
//     }
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// }

// /**
//  * GET /api/users
//  */
// async function listUsers(req, res) {
//   try {
//     const conn = await getPool("orders").getConnection();

//     try {
//       const [rows] = await conn.query(
//         "SELECT user_id, user_name, user_group, real_name, email, status, office_location FROM users ORDER BY user_id ASC"
//       );

//       // （可選）審計：READ 列表（通常不記）
//       // await logAccountAction({ req, actorUserId: Number(req.jwt?.uid)||0, crudOperation: "READ", description: "list users" });

//       res.json({ ok: true, data: rows });
//     } finally {
//       conn.release();
//     }
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// }

// /**
//  * GET /api/users/:id
//  */
// async function getUser(req, res) {
//   const userId = Number(req.params.id);

//   if (!userId) {
//     return res.status(400).json({ ok: false, error: "userId required" });
//   }

//   try {
//     const conn = await getPool("orders").getConnection();

//     try {
//       const [rows] = await conn.query(
//         "SELECT user_id, user_name, user_group, real_name, email, status, office_location FROM users WHERE user_id=?",
//         [userId]
//       );

//       if (rows.length === 0) {
//         return res.status(404).json({ ok: false, error: "user not found" });
//       }

//       // （可選）審計：READ 單筆（通常不記）
//       // await logAccountAction({ req, actorUserId: Number(req.jwt?.uid)||0, targetUserId: userId, crudOperation: "READ", description: "get user" });

//       res.json({ ok: true, data: rows[0] });
//     } finally {
//       conn.release();
//     }
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// }

// module.exports = {
//   createUser,
//   deleteUser,
//   login,
//   updateUser,
//   updateStatus,
//   resetPassword,
//   listUsers,
//   getUser,
// };










const { getPool } = require("../database");
const bcrypt = require("bcryptjs");
const { signToken } = require("../middleware/auth");
const { logLoginAttempt, logAccountAction } = require("../audit/audit-logger");

// Toggle verbose auth logging with DEBUG_AUTH=1|true|yes|on
const DEBUG_AUTH = /^(1|true|yes|on)$/i.test(process.env.DEBUG_AUTH || "");
const d  = (...args) => DEBUG_AUTH && console.log(...args);
const de = (...args) => DEBUG_AUTH && console.error(...args);

// ====== 小工具：校驗/正規化/差異摘要 ======
// 新增 former employees v2.1.1 在v2.1.0之後增加
function validGroup(group) {
  return ["superadmin", "admin", "staff", "former employees"].includes(group);
}
function validStatus(status) {
  return ["active", "inactive"].includes(status);
}

function normStrOrNull(v) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function repr(v) {
  // 將 null/undefined 呈現為 (null)，避免空字串與 null 混淆
  return v == null ? "(null)" : String(v);
}
function diffFields(oldRow, newRow, fields) {
  const diffs = [];
  for (const f of fields) {
    const oldV = oldRow?.[f] ?? null;
    const newV = newRow?.[f] ?? null;
    if (oldV !== newV) {
      diffs.push(`${f}: ${repr(oldV)} -> ${repr(newV)}`);
    }
  }
  return diffs;
}

const FIELDS_UPDATABLE = [
  "user_name",
  "user_group",
  "real_name",
  "email",
  "status",
  "office_location",
];

// ====== Handlers ======

/**
 * POST /api/users
 * body: { user_name, password, user_group, email, real_name?, status?, office_location? }
 */
async function createUser(req, res) {
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
    const normalizedRealName  = normStrOrNull(real_name);
    const normalizedOffice    = normStrOrNull(office_location);
    const conn = await getPool("orders").getConnection();

    try {
      const [result] = await conn.query(
        "INSERT INTO users (user_name, user_password, user_group, real_name, email, status, office_location) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [user_name, hash, user_group, normalizedRealName, email, status, normalizedOffice]
      );

      // 審計：建立帳號（摘要）
      try {
        const desc = `create user ${user_name}`;
        await logAccountAction({
          req,
          actorUserId : Number(req.jwt?.uid) || 0,
          targetUserId: Number(result.insertId) || null,
          crudOperation: "CREATE",
          description : desc,
        });
      } catch (e) { de("[AUDIT][createUser] err:", e); }

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
      const [[superadminCount]] = await conn.query(
        "SELECT COUNT(*) AS c FROM users WHERE user_group='superadmin'"
      );
      const [[target]] = await conn.query(
        "SELECT user_group, user_name FROM users WHERE user_id=?",
        [userId]
      );

      if (!target) {
        return res.status(404).json({ ok: false, error: "user not found" });
      }
      if (target.user_group === "superadmin" && superadminCount.c <= 1) {
        return res.status(400).json({ ok: false, error: "cannot delete the last superadmin" });
      }

      const [result] = await conn.query("DELETE FROM users WHERE user_id=?", [userId]);

      // 審計：刪除帳號
      try {
        await logAccountAction({
          req,
          actorUserId : Number(req.jwt?.uid) || 0,
          targetUserId: userId,
          crudOperation: "DELETE",
          description : `delete user ${target.user_name}`,
        });
      } catch (e) { de("[AUDIT][deleteUser] err:", e); }

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
    return res.status(400).json({ ok: false, error: "login and password are required" });
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
        try {
          await logLoginAttempt({
            req,
            actorUserId: 0,
            success: false,
            description: "invalid credentials (user not found)",
          });
        } catch (e) { de("[AUDIT][login:!user] err:", e); }
        return res.status(401).json({ ok: false, error: "invalid credentials" });
      }

      if (user.status === "inactive") {
        try {
          await logLoginAttempt({
            req,
            actorUserId: Number(user.user_id) || 0,
            success: false,
            description: "account inactive",
          });
        } catch (e) { de("[AUDIT][login:inactive] err:", e); }
        return res.status(403).json({ ok: false, error: "account inactive" });
      }

      const match = await bcrypt.compare(password, user.user_password);
      d("[LOGIN] password compare:", match);

      if (!match) {
        try {
          await logLoginAttempt({
            req,
            actorUserId: Number(user.user_id) || 0,
            success: false,
            description: "invalid credentials (password mismatch)",
          });
        } catch (e) { de("[AUDIT][login:badpass] err:", e); }
        return res.status(401).json({ ok: false, error: "invalid credentials" });
      }

      const token = signToken({ uid: user.user_id, role: user.user_group });
      delete user.user_password;

      try {
        await logLoginAttempt({
          req,
          actorUserId: Number(user.user_id) || 0,
          success: true,
          description: "login ok",
        });
      } catch (e) { de("[AUDIT][login:ok] err:", e); }

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
 * PUT /api/users/:id
 * body: { user_name, user_group, email, real_name?, status?, office_location? }
 * ——— 會寫入「變更前 -> 變更後」摘要到 audit_log.action_description
 */
async function updateUser(req, res) {
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

  const normalizedRealName = normStrOrNull(real_name);
  const normalizedOffice   = normStrOrNull(office_location);

  try {
    const conn = await getPool("orders").getConnection();
    try {
      // 1) 取舊值
      const [[before]] = await conn.query(
        "SELECT user_name, user_group, real_name, email, status, office_location FROM users WHERE user_id=?",
        [userId]
      );
      if (!before) {
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      // 2) 更新
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
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      // 3) 建立「新值」物件，與舊值比對，輸出差異摘要
      const after = {
        user_name,
        user_group,
        real_name: normalizedRealName,
        email,
        status,
        office_location: normalizedOffice,
      };
      const diffs = diffFields(before, after, FIELDS_UPDATABLE);
      const summary = diffs.length ? diffs.join("; ") : "no field changed";

      // 4) 審計紀錄：把差異寫入 description
      try {
        await logAccountAction({
          req,
          actorUserId : Number(req.jwt?.uid) || 0,
          targetUserId: userId,
          crudOperation: "UPDATE",
          description : `update user ${before.user_name} | ${summary}`,
        });
      } catch (e) { de("[AUDIT][updateUser] err:", e); }

      res.json({ ok: true, affectedRows: result.affectedRows, changes: diffs });
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
 * PUT /api/users/:id/status
 * body: { status }
 * ——— 會寫入「status: 舊 -> 新」到 audit_log.action_description
 */
async function updateStatus(req, res) {
  const userId = Number(req.params.id);
  const { status } = req.body || {};

  if (!userId || !status) {
    return res.status(400).json({ ok: false, error: "userId and status are required" });
  }
  if (!validStatus(status)) {
    return res
      .status(400)
      .json({ ok: false, error: "status must be 'active' or 'inactive'" });
  }

  try {
    const conn = await getPool("orders").getConnection();
    try {
      const [[before]] = await conn.query(
        "SELECT user_name, status FROM users WHERE user_id=?",
        [userId]
      );
      if (!before) {
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      const [result] = await conn.query(
        "UPDATE users SET status=? WHERE user_id=?",
        [status, userId]
      );

      // 審計：只記 status 差異
      try {
        const summary = before.status !== status
          ? `status: ${repr(before.status)} -> ${repr(status)}`
          : "status: no change";
        await logAccountAction({
          req,
          actorUserId : Number(req.jwt?.uid) || 0,
          targetUserId: userId,
          crudOperation: "UPDATE",
          description : `update user ${before.user_name} | ${summary}`,
        });
      } catch (e) { de("[AUDIT][updateStatus] err:", e); }

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
 * ——— 出於安全不記明文變更，只記「重設密碼」事件
 */
async function resetPassword(req, res) {
  const userId = Number(req.params.id);
  const { password } = req.body || {};

  if (!userId || !password) {
    return res.status(400).json({ ok: false, error: "userId and password are required" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const conn = await getPool("orders").getConnection();

    try {
      const [[user]] = await conn.query(
        "SELECT user_name FROM users WHERE user_id=?",
        [userId]
      );
      if (!user) {
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      const [result] = await conn.query(
        "UPDATE users SET user_password=? WHERE user_id=?",
        [hash, userId]
      );

      // 審計：安全地記錄（不含任何密碼值）
      try {
        await logAccountAction({
          req,
          actorUserId : Number(req.jwt?.uid) || 0,
          targetUserId: userId,
          crudOperation: "UPDATE",
          description : `reset password for ${user.user_name}`,
        });
      } catch (e) { de("[AUDIT][resetPassword] err:", e); }

      res.json({ ok: true, affectedRows: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}



// === NEW === 將某用戶標記為「former employees」v2.1.1 添加于 v2.1.0之後
/**
 * PUT /api/users/:id/mark-former
 * ——— 會寫入「變更前 -> 變更後」摘要到 audit_log.action_description
 */
async function markFormer(req, res) {
  const userId = Number(req.params.id);
  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId required" });
  }

  try {
    const conn = await getPool("orders").getConnection();
    try {
      // 1) 先查當前資料
      const [[before]] = await conn.query(
        "SELECT user_id, user_name, user_group FROM users WHERE user_id=?",
        [userId]
      );
      if (!before) {
        return res.status(404).json({ ok: false, error: "user not found" });
      }

      // 如果已經是 former employees，直接返回 OK
      if (before.user_group === "former employees") {
        return res.json({ ok: true, affectedRows: 0, message: "already former employees" });
      }

      // 2) 更新 user_group
      const [result] = await conn.query(
        "UPDATE users SET user_group=? WHERE user_id=?",
        ["former employees", userId]
      );

      // 3) 審計 —— 不改原有刪除審計的任何代碼
      try {
        const desc = `mark user ${before.user_name} (#${userId}) as 'former employees'`;
        await logAccountAction({
          req,
          actorUserId : Number(req?.jwt?.uid) || 0,   // 若有 JWT，記操作者
          targetUserId: userId,
          crudOperation: "UPDATE",
          description : desc,
        });
      } catch (e) {
        // 容錯：審計失敗不影響主流程
        console.error("[audit] markFormer failed:", e?.message || e);
      }

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
  deleteUser,   // 保留删除功能但前端隐藏按钮 v2.1.1 修改于 v2.1.0之後
  login,
  updateUser,
  updateStatus,
  resetPassword,
  listUsers,
  getUser,
  markFormer,  // v2.1.1 新增 增加于 v2.1.0之後
};
