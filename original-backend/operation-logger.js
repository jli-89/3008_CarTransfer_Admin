const { getPool } = require("./database");

const ACTION_VALUES = ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "ASSIGN", "EXPORT"];
const ACTIONS = new Set(ACTION_VALUES);

const ENTITY_TYPE_VALUES = [
  "ORDER",
  "ITEM",
  "QUOTE",
  "TIMESHEET",
  "DAILY_REPORT",
  "LOCATION",
  "ROUTE_PRICE",
];
const ENTITY_TYPES = new Set(ENTITY_TYPE_VALUES);

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
      req?.jwt?.uname || req?.jwt?.user_name || req?.jwt?.name || req?.jwt?.realName,
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

function normalizeEntityId(entityId) {
  const normalized = Number(entityId);
  if (!Number.isFinite(normalized)) {
    throw new Error("entityId must be a finite number");
  }
  return normalized;
}

function normalizeOrderId(orderId) {
  if (orderId === null || orderId === undefined) {
    return null;
  }
  const normalized = Number(orderId);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeDetails(details) {
  if (details === null || details === undefined) {
    return null;
  }

  if (typeof details === "string") {
    return toNullableTrimmed(details, 4000);
  }

  try {
    const serialized = JSON.stringify(details);
    if (typeof serialized === "string" && serialized.length) {
      return serialized.length > 4000 ? serialized.slice(0, 4000) : serialized;
    }
  } catch (err) {
    // fall through
  }

  return toNullableTrimmed(String(details), 4000);
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
    const normalizedEntityId = normalizeEntityId(entityId);
    const normalizedOrderId = normalizeOrderId(orderId);
    const actionValue = normalizeAction(action);
    const entityTypeValue = normalizeEntityType(entityType);

    const { actor_user_id, actor_name } = extractActor(req);
    const { client_ip, user_agent } = extractRequestMeta(req);
    const detailsValue = normalizeDetails(details);

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
          normalizedOrderId,
          detailsValue,
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
  ACTION_VALUES,
  ENTITY_TYPE_VALUES,
};
