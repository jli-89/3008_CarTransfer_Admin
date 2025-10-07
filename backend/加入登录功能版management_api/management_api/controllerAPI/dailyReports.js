const { getPool } = require("../database");
const { logOperation } = require("../operation-logger");

function validationError(message) {
  const error = new Error(message);
  error.isValidation = true;
  return error;
}

function notFoundError(message) {
  const error = new Error(message);
  error.notFound = true;
  return error;
}

function toNullableTrimmed(value, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }
  const str = String(value).trim();
  if (!str) {
    return null;
  }
  return maxLength && str.length > maxLength ? str.slice(0, maxLength) : str;
}

function normalizeDate(value, fieldName) {
  if (!value) {
    throw validationError(`${fieldName} is required`);
  }
  const str = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw validationError(`${fieldName} must be formatted as YYYY-MM-DD`);
  }
  return str;
}

function normalizeTime(value, fieldName, optional = false) {
  if (value === undefined || value === null || value === "") {
    return optional ? null : null;
  }
  const str = String(value).trim();
  if (!/^\d{2}:\d{2}$/.test(str)) {
    throw validationError(`${fieldName} must be formatted as HH:MM`);
  }
  return `${str}:00`;
}

function parsePositiveInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw validationError(`${fieldName} must be a positive integer`);
  }
  return num;
}

function parseOptionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return parsePositiveInt(value, fieldName);
}

function normalizeClientPayload(rawClient, index) {
  if (!rawClient || typeof rawClient !== "object") {
    throw validationError(`clients[${index}] must be an object`);
  }
  const ordinal = parsePositiveInt(rawClient.ordinal_no ?? index + 1, `clients[${index}].ordinal_no`);
  const client_name = toNullableTrimmed(rawClient.client_name, 255);
  const details = rawClient.details ?? null;
  const notes = rawClient.notes ?? null;
  const action_required = rawClient.action_required ?? null;
  const status = rawClient.status ? String(rawClient.status).trim() : "Not Solved";
  const normalizedStatus = ["Solved", "Not Solved", "Complete"].includes(status)
    ? status
    : "Not Solved";
  let extra_json = null;
  if (rawClient.extra_json !== undefined && rawClient.extra_json !== null) {
    try {
      extra_json = JSON.stringify(rawClient.extra_json);
    } catch (err) {
      throw validationError(`clients[${index}].extra_json must be JSON serialisable`);
    }
  }
  return {
    ordinal_no: ordinal,
    client_name,
    details,
    notes,
    action_required,
    status: normalizedStatus,
    extra_json,
  };
}

function parsePage(value, fallback = 1, max = 1000) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return fallback;
  }
  return Math.min(num, max);
}

function mapReportRow(row) {
  return {
    report_id: row.report_id,
    report_date: row.report_date,
    start_time: row.start_time,
    end_time: row.end_time,
    staff_user_id: row.staff_user_id,
    staff_name: row.staff_name || row.user_real_name || row.user_name || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client_count: Number(row.client_count) || 0,
  };
}

async function createDailyReport(req, res) {
  const payload = req.body || {};
  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const reportDate = normalizeDate(payload.report_date, "report_date");
    const startTime = normalizeTime(payload.start_time, "start_time", true);
    const endTime = normalizeTime(payload.end_time, "end_time", true);
    const staffUserId = payload.staff_user_id
      ? parsePositiveInt(payload.staff_user_id, "staff_user_id")
      : Number(req?.jwt?.uid) || null;

    let staffName = toNullableTrimmed(payload.staff_name, 100);
    if (!staffName && staffUserId) {
      const [rows] = await conn.query(
        "SELECT user_name, real_name FROM users WHERE user_id=?",
        [staffUserId]
      );
      const user = rows[0];
      if (user) {
        staffName = toNullableTrimmed(user.real_name, 100) || toNullableTrimmed(user.user_name, 100);
      }
    }

    const clientsPayload = Array.isArray(payload.clients) ? payload.clients : [];
    if (!clientsPayload.length) {
      throw validationError("At least one client entry is required");
    }
    const normalizedClients = clientsPayload.map(normalizeClientPayload);

    const [result] = await conn.query(
      `INSERT INTO daily_staff_reports (
          report_date,
          start_time,
          end_time,
          staff_user_id,
          staff_name
        ) VALUES (?, ?, ?, ?, ?)`
      , [
        reportDate,
        startTime,
        endTime,
        staffUserId,
        staffName,
      ]
    );

    const reportId = result.insertId;

    for (const client of normalizedClients) {
      await conn.query(
        `INSERT INTO daily_report_clients (
            report_id,
            ordinal_no,
            client_name,
            details,
            notes,
            action_required,
            status,
            extra_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ${client.extra_json !== null ? "?" : "NULL"})`,
        client.extra_json !== null
          ? [
              reportId,
              client.ordinal_no,
              client.client_name,
              client.details,
              client.notes,
              client.action_required,
              client.status,
              client.extra_json,
            ]
          : [
              reportId,
              client.ordinal_no,
              client.client_name,
              client.details,
              client.notes,
              client.action_required,
              client.status,
            ]
      );
    }

    await conn.commit();

    try {
      await logOperation({
        req,
        action: "CREATE",
        entityType: "DAILY_REPORT",
        entityId: reportId,
        details: {
          report_id: reportId,
          staff_user_id: staffUserId,
          client_count: normalizedClients.length,
        },
      });
    } catch (logErr) {
      console.error("[dailyReports.create][log]", logErr);
    }

    req.params.reportId = String(reportId);
    return getDailyReport(req, res);
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error("[dailyReports.create][rollback]", rollbackErr);
      }
    }
    if (err?.isValidation) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    console.error("[dailyReports.create]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function listDailyReports(req, res) {
  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  const filters = [];
  const params = [];

  const staffId = parseOptionalPositiveInt(req.query?.staff_user_id, "staff_user_id");
  if (staffId) {
    filters.push("r.staff_user_id = ?");
    params.push(staffId);
  }

  if (req.query?.date_from) {
    const dateFrom = normalizeDate(req.query.date_from, "date_from");
    filters.push("r.report_date >= ?");
    params.push(dateFrom);
  }

  if (req.query?.date_to) {
    const dateTo = normalizeDate(req.query.date_to, "date_to");
    filters.push("r.report_date <= ?");
    params.push(dateTo);
  }

  const status = req.query?.status;
  if (status) {
    const statuses = String(status)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length) {
      filters.push(`r.report_id IN (
        SELECT report_id FROM daily_report_clients WHERE status IN (${statuses.map(() => "?").join(",")})
      )`);
      params.push(...statuses);
    }
  }

  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const page = parsePage(req.query?.page, 1, 1000);
  const pageSize = parsePage(req.query?.pageSize || req.query?.limit, 20, 100);

  let conn;
  try {
    conn = await pool.getConnection();

    const [[{ total }]] = await conn.query(
      `SELECT COUNT(*) AS total FROM daily_staff_reports r ${whereSql}`,
      params
    );
    const totalNumber = Number(total) || 0;
    const totalPages = totalNumber === 0 ? 1 : Math.ceil(totalNumber / pageSize);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const offset = (safePage - 1) * pageSize;

    const [rows] = await conn.query(
      `SELECT r.*, u.user_name, u.real_name AS user_real_name,
              COUNT(c.client_id) AS client_count
         FROM daily_staff_reports r
         LEFT JOIN users u ON u.user_id = r.staff_user_id
         LEFT JOIN daily_report_clients c ON c.report_id = r.report_id
         ${whereSql}
         GROUP BY r.report_id
         ORDER BY r.created_at DESC, r.report_id DESC
         LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      ok: true,
      data: rows.map(mapReportRow),
      meta: {
        total: totalNumber,
        page: safePage,
        pageSize,
        totalPages,
        hasMore: safePage < totalPages,
      },
    });
  } catch (err) {
    console.error("[dailyReports.list]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function getDailyReport(req, res) {
  const reportId = parsePositiveInt(req.params.reportId, "reportId");
  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT r.*, u.user_name, u.real_name AS user_real_name,
              COUNT(c.client_id) AS client_count
         FROM daily_staff_reports r
         LEFT JOIN users u ON u.user_id = r.staff_user_id
         LEFT JOIN daily_report_clients c ON c.report_id = r.report_id
        WHERE r.report_id = ?
        GROUP BY r.report_id`
      , [reportId]
    );

    const report = rows[0];
    if (!report) {
      throw notFoundError("daily report not found");
    }

    const [clientRows] = await conn.query(
      `SELECT client_id, ordinal_no, client_name, details, notes, action_required, status, extra_json,
              created_at, updated_at
         FROM daily_report_clients
        WHERE report_id = ?
        ORDER BY ordinal_no ASC`,
      [reportId]
    );

    const clients = clientRows.map((client) => ({
      ...client,
      extra_json: client.extra_json ? JSON.parse(client.extra_json) : null,
    }));

    res.json({
      ok: true,
      data: {
        ...mapReportRow(report),
        staff_name: report.staff_name || report.user_real_name || report.user_name || null,
        clients,
      },
    });
  } catch (err) {
    if (err?.notFound) {
      return res.status(404).json({ ok: false, error: err.message });
    }
    console.error("[dailyReports.get]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function listMyDailyReports(req, res) {
  const userId = Number(req?.jwt?.uid);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }
  req.query = {
    ...req.query,
    staff_user_id: String(userId),
  };
  return listDailyReports(req, res);
}

module.exports = {
  createDailyReport,
  listDailyReports,
  getDailyReport,
  listMyDailyReports,
};
