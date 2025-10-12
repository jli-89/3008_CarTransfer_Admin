const { auditPool } = require("./audit-database");

function toUnsignedNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.trunc(num) : fallback;
}

function truncate(value, maxLength) {
  if (!value) {
    return null;
  }
  const str = String(value).trim();
  if (!str) {
    return null;
  }
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

function extractRequestMeta(req) {
  if (!req) {
    return { ipAddress: null, userAgent: null };
  }

  const forwarded = req.headers?.["x-forwarded-for"];
  const ipAddress = truncate(
    forwarded ? forwarded.split(",")[0] : req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
    45
  );
  const userAgent = truncate(req.headers?.["user-agent"], 255);

  return { ipAddress, userAgent };
}

async function insertAuditRecord({
  eventType,
  actorUserId,
  targetUserId = null,
  crudOperation = null,
  actionDescription = null,
  loginSuccess = null,
  ipAddress = null,
  userAgent = null,
}) {
  const entry = {
    eventType,
    actorUserId: toUnsignedNumber(actorUserId),
    targetUserId: targetUserId != null ? toUnsignedNumber(targetUserId, null) : null,
    crudOperation: crudOperation ? crudOperation.toUpperCase() : null,
    actionDescription: truncate(actionDescription, 255),
    loginSuccess:
      typeof loginSuccess === "number"
        ? (loginSuccess ? 1 : 0)
        : loginSuccess != null
        ? (loginSuccess ? 1 : 0)
        : null,
    ipAddress: truncate(ipAddress, 45),
    userAgent: truncate(userAgent, 255),
  };

  try {
    const conn = await auditPool.getConnection();
    try {
      await conn.query(
        `INSERT INTO audit_log (
            event_type,
            actor_user_id,
            target_user_id,
            crud_operation,
            action_description,
            login_success,
            ip_address,
            user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.eventType,
          entry.actorUserId,
          entry.targetUserId,
          entry.crudOperation,
          entry.actionDescription,
          entry.loginSuccess,
          entry.ipAddress,
          entry.userAgent,
        ]
      );
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("[AUDIT] Failed to write audit log entry:", err.message);
  }
}

async function logLoginAttempt({ req, actorUserId = 0, success, description }) {
  const { ipAddress, userAgent } = extractRequestMeta(req);
  await insertAuditRecord({
    eventType: "LOGIN",
    actorUserId,
    actionDescription: description,
    loginSuccess: success ? 1 : 0,
    ipAddress,
    userAgent,
  });
}

async function logAccountAction({
  req,
  actorUserId = 0,
  targetUserId = null,
  crudOperation,
  description,
}) {
  const { ipAddress, userAgent } = extractRequestMeta(req);
  await insertAuditRecord({
    eventType: "ACCOUNT_ACTION",
    actorUserId,
    targetUserId,
    crudOperation,
    actionDescription: description,
    ipAddress,
    userAgent,
  });
}

module.exports = {
  logLoginAttempt,
  logAccountAction,
};
