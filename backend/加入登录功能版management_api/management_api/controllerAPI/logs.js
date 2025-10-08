const { getPool } = require("../database");
const { getAuditPool } = require("../audit/audit-database");
const { ACTION_VALUES, ENTITY_TYPE_VALUES } = require("../operation-logger");

const QUOTE_ENTITY_TYPES = new Set(["LOCATION", "ROUTE_PRICE"]);
const ACTION_SET = new Set(ACTION_VALUES);
const ENTITY_SET = new Set(ENTITY_TYPE_VALUES);

function parsePage(value) {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

function parsePageSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) {
    return 20;
  }
  return Math.min(100, Math.floor(size));
}

function normalizeDateInput(value, endOfDay = false) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^[0-9T:\-\s]+$/.test(trimmed)) {
    return null;
  }
  if (trimmed.length === 10) {
    return `${trimmed} ${endOfDay ? "23:59:59" : "00:00:00"}`;
  }
  return trimmed;
}

function normalizeActionFilter(value) {
  if (!value) {
    return null;
  }
  const upper = String(value).trim().toUpperCase();
  return ACTION_SET.has(upper) ? upper : null;
}

function normalizeEntityFilter(value) {
  if (!value) {
    return null;
  }
  const upper = String(value).trim().toUpperCase();
  return ENTITY_SET.has(upper) ? upper : null;
}

function buildPagination(req) {
  const page = parsePage(req.query?.page);
  const pageSize = parsePageSize(req.query?.pageSize ?? req.query?.limit);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset, limit: pageSize };
}

async function listOperationLogs(req, res) {
  try {
    const pool = getPool("orders");
    if (!pool) {
      return res.status(500).json({ ok: false, error: "Operation log database is not configured" });
    }

    const { page, pageSize, offset, limit } = buildPagination(req);
    const conditions = [];
    const params = [];

    const databaseFilter = (req.query?.database || "").trim();
    if (databaseFilter === "car_transport_quotes") {
      conditions.push("entity_type IN (?, ?)");
      params.push("LOCATION", "ROUTE_PRICE");
    } else if (databaseFilter === "car_transport2") {
      conditions.push("entity_type NOT IN (?, ?)");
      params.push("LOCATION", "ROUTE_PRICE");
    } else if (databaseFilter && databaseFilter !== "all") {
      return res.status(400).json({ ok: false, error: "Invalid database filter for operation logs" });
    }

    const start = normalizeDateInput(req.query?.start, false);
    if (start) {
      conditions.push("op_time >= ?");
      params.push(start);
    }
    const end = normalizeDateInput(req.query?.end, true);
    if (end) {
      conditions.push("op_time <= ?");
      params.push(end);
    }

    const entityType = normalizeEntityFilter(req.query?.entityType);
    if (entityType) {
      conditions.push("entity_type = ?");
      params.push(entityType);
    }

    const action = normalizeActionFilter(req.query?.action);
    if (action) {
      conditions.push("action = ?");
      params.push(action);
    }

    const actor = req.query?.actor || req.query?.user;
    if (actor) {
      const trimmed = String(actor).trim();
      const actorId = Number(trimmed);
      if (Number.isFinite(actorId)) {
        conditions.push("(actor_user_id = ? OR (actor_name IS NOT NULL AND actor_name LIKE ?))");
        params.push(actorId, `%${trimmed}%`);
      } else {
        conditions.push("(actor_name IS NOT NULL AND actor_name LIKE ?)");
        params.push(`%${trimmed}%`);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT op_id,
              op_time,
              actor_user_id,
              actor_name,
              action,
              entity_type,
              entity_id,
              order_id,
              details,
              client_ip,
              user_agent
         FROM operation_log
        ${whereClause}
        ORDER BY op_time DESC, op_id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM operation_log ${whereClause}`,
      params
    );

    const data = rows.map((row) => ({
      ...row,
      details: row.details != null ? String(row.details) : null,
      source: QUOTE_ENTITY_TYPES.has(row.entity_type) ? "car_transport_quotes" : "car_transport2",
    }));

    res.json({ ok: true, data, page, pageSize, total });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listAuditLogs(req, res) {
  try {
    const pool = getAuditPool();
    if (!pool) {
      return res.status(500).json({ ok: false, error: "Audit log database is not configured" });
    }

    const databaseFilter = (req.query?.database || "").trim();
    if (databaseFilter && databaseFilter !== "car_transport_audit" && databaseFilter !== "all") {
      return res.status(400).json({ ok: false, error: "Invalid database filter for audit logs" });
    }

    const { page, pageSize, offset, limit } = buildPagination(req);
    const conditions = [];
    const params = [];

    const start = normalizeDateInput(req.query?.start, false);
    if (start) {
      conditions.push("occurred_at >= ?");
      params.push(start);
    }
    const end = normalizeDateInput(req.query?.end, true);
    if (end) {
      conditions.push("occurred_at <= ?");
      params.push(end);
    }

    const actor = req.query?.actor || req.query?.user;
    if (actor) {
      const trimmed = String(actor).trim();
      const actorId = Number(trimmed);
      if (Number.isFinite(actorId)) {
        conditions.push("actor_user_id = ?");
        params.push(actorId);
      } else {
        conditions.push("action_description LIKE ?");
        params.push(`%${trimmed}%`);
      }
    }

    const action = normalizeActionFilter(req.query?.action);
    if (action) {
      conditions.push("crud_operation = ?");
      params.push(action);
    }

    const eventType = req.query?.entityType ? String(req.query.entityType).trim().toUpperCase() : null;
    if (eventType) {
      conditions.push("event_type = ?");
      params.push(eventType);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT audit_id,
              occurred_at,
              event_type,
              actor_user_id,
              target_user_id,
              crud_operation,
              action_description,
              login_success,
              ip_address,
              user_agent
         FROM audit_log
        ${whereClause}
        ORDER BY occurred_at DESC, audit_id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_log ${whereClause}`,
      params
    );

    const data = rows.map((row) => ({
      ...row,
      source: "car_transport_audit",
    }));

    res.json({ ok: true, data, page, pageSize, total });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  listOperationLogs,
  listAuditLogs,
};
