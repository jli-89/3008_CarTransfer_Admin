const { getPool } = require("./database");

const ACTIONS = new Set([
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "ASSIGN",
  "EXPORT",
]);

const ENTITY_TYPES = new Set(["ORDER", "ITEM", "QUOTE", "TIMESHEET"]);

function toNullableTrimmed(value, maxLength) {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  if (!str) {
    return null;
  }
  return maxLength && str.length > maxLength ? str.slice(0, maxLength) : str;
}

function extractActor(req) {
  const rawId = Number(req?.jwt?.uid);
  const actor_user_id = Number.isFinite(rawId) && rawId > 0 ? rawId : null;
  const actor_name =
    toNullableTrimmed(
      req?.jwt?.uname ||
        req?.jwt?.user_name ||
        req?.jwt?.name ||
        req?.jwt?.realName,
      100
    ) || null;
  return { actor_user_id, actor_name };
}

function extractRequestMeta(req) {
  if (!req) {
    return { client_ip: null, user_agent: null };
  }
  const forwarded = req.headers?.["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(",")[0] : req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  const client_ip = toNullableTrimmed(ip, 45);
  const user_agent = toNullableTrimmed(req.headers?.["user-agent"], 255);
  return { client_ip, user_agent };
}

function normalizeAction(action) {
  if (!action) {
    return "UPDATE";
  }
  const upper = String(action).trim().toUpperCase();
  return ACTIONS.has(upper) ? upper : "UPDATE";
}

function normalizeEntityType(entityType) {
  const upper = String(entityType).trim().toUpperCase();
  if (!ENTITY_TYPES.has(upper)) {
    throw new Error(`Invalid entityType '${entityType}' for operation log`);
  }
  return upper;
}

async function logOperation({
  req,
  action = "UPDATE",
  entityType,
  entityId,
  orderId = null,
  details = null,
}) {
  try {
    const normalizedEntityId = Number(entityId);
    if (!Number.isFinite(normalizedEntityId)) {
      throw new Error("entityId must be a finite number");
    }

    const normalizedOrderId =
      orderId !== null && orderId !== undefined ? Number(orderId) : null;
    const orderIdValue = Number.isFinite(normalizedOrderId)
      ? normalizedOrderId
      : null;

    const actionValue = normalizeAction(action);
    const entityTypeValue = normalizeEntityType(entityType);

    const { actor_user_id, actor_name } = extractActor(req);
    const { client_ip, user_agent } = extractRequestMeta(req);

    const pool = getPool("orders");
    if (!pool) {
      throw new Error("Orders database pool not available for operation log");
    }

    const conn = await pool.getConnection();
    try {
      await conn.query(
        `INSERT INTO operation_log (
            actor_user_id,
            actor_name,
            action,
            entity_type,
            entity_id,
            order_id,
            details,
            client_ip,
            user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          actor_user_id,
          actor_name,
          actionValue,
          entityTypeValue,
          normalizedEntityId,
          orderIdValue,
          details != null ? JSON.stringify(details) : null,
          client_ip,
          user_agent,
        ]
      );
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("[operation-log] failed to record entry:", err.message);
  }
}

module.exports = {
  logOperation,
};
