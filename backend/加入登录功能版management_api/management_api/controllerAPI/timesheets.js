const crypto = require("crypto");

const { getPool } = require("../database");
const { logOperation } = require("../operation-logger");

const TIMESHEET_STATUS = new Set(["draft", "submitted", "approved", "rejected"]);
const SIGNER_ROLES = new Set(["employee", "manager"]);

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

function toNullableString(value, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }
  const str = String(value).trim();
  if (!str) {
    return null;
  }
  return maxLength && str.length > maxLength ? str.slice(0, maxLength) : str;
}

function normalizeRequiredString(value, maxLength, fieldName) {
  const str = toNullableString(value, maxLength);
  if (!str) {
    throw validationError(`${fieldName} is required`);
  }
  return str;
}

function normalizeOptionalString(value, maxLength) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const str = String(value).trim();
  if (!str) {
    return null;
  }
  return maxLength && str.length > maxLength ? str.slice(0, maxLength) : str;
}

function normalizeEnum(value, values, fieldName, fallback = null) {
  if (value === undefined || value === null) {
    if (fallback !== null) {
      return fallback;
    }
    throw validationError(`${fieldName} is required`);
  }
  const normalized = String(value).trim().toLowerCase();
  for (const entry of values) {
    if (entry.toLowerCase() === normalized) {
      return entry;
    }
  }
  throw validationError(`${fieldName} is invalid`);
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
    if (optional) {
      return null;
    }
    throw validationError(`${fieldName} is required`);
  }
  const str = String(value).trim();
  if (!/^\d{2}:\d{2}$/.test(str)) {
    throw validationError(`${fieldName} must be formatted as HH:MM`);
  }
  return `${str}:00`;
}

function calculateTotalMinutes(startTime, endTime) {
  if (!startTime || !endTime) {
    return null;
  }
  const start = new Date(`1970-01-01T${startTime}Z`);
  const end = new Date(`1970-01-01T${endTime}Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const diffMs = end.getTime() - start.getTime();
  const minutes = Math.round(diffMs / 60000);
  return Number.isFinite(minutes) ? minutes : null;
}

function buildUserDisplay(user) {
  if (!user) {
    return null;
  }
  const realName = user.real_name?.trim();
  if (realName) {
    return realName;
  }
  const userName = user.user_name?.trim();
  return userName || null;
}

function parseSignatureDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw validationError("signature must be a data URL");
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw validationError("signature must be a base64 data URL");
  }
  const mimeType = match[1];
  const base64 = match[2];
  if (!base64) {
    throw validationError("signature payload is empty");
  }
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) {
    throw validationError("signature payload is empty");
  }
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  return { mimeType, buffer, sha256 };
}

function parseIntOrNull(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw validationError(`${fieldName} must be a positive integer or null`);
  }
  return num;
}

function parsePositiveInt(value, fallback, max = 100) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return fallback;
  }
  if (max && num > max) {
    return max;
  }
  return num;
}

async function resolveUser(conn, cache, userId, fieldName) {
  const normalized = parseIntOrNull(userId, fieldName);
  if (normalized === undefined) {
    return undefined;
  }
  if (normalized === null) {
    return null;
  }
  if (cache.has(normalized)) {
    return normalized;
  }
  const [rows] = await conn.query(
    "SELECT user_id FROM users WHERE user_id=?",
    [normalized]
  );
  if (!rows.length) {
    throw validationError(`${fieldName} references a non-existent user`);
  }
  cache.set(normalized, true);
  return normalized;
}

function mapTimesheetRow(row) {
  return {
    timesheet_id: row.timesheet_id,
    staff_user_id: row.staff_user_id,
    staff_display_name: buildUserDisplay({
      user_name: row.staff_user_name,
      real_name: row.staff_real_name,
    }),
    work_date: row.work_date,
    start_time: row.start_time,
    end_time: row.end_time,
    total_minutes: row.total_minutes,
    location: row.location,
    notes: row.notes,
    status: row.status,
    submitted_at: row.submitted_at,
    approved_by_user_id: row.approved_by_user_id,
    approved_by_display_name: buildUserDisplay({
      user_name: row.approver_user_name,
      real_name: row.approver_real_name,
    }),
    approved_at: row.approved_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    has_employee_signature: Boolean(row.employee_signature_id),
    has_manager_signature: Boolean(row.manager_signature_id),
  };
}

async function listTimesheets(req, res) {
  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  const filters = [];
  const params = [];

  const includeApproved = String(req.query?.include_approved || '').toLowerCase() === 'true';

  const status = req.query?.status;
  if (status) {
    const statuses = String(status)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => normalizeEnum(s, TIMESHEET_STATUS, "status"));
    if (statuses.length) {
      filters.push(`t.status IN (${statuses.map(() => "?").join(",")})`);
      params.push(...statuses);
    }
  } else if (!includeApproved) {
    filters.push("t.status <> 'approved'");
  }

  const staffId = parseIntOrNull(req.query?.staff_user_id, "staff_user_id");
  if (staffId && Number.isInteger(staffId)) {
    filters.push("t.staff_user_id = ?");
    params.push(staffId);
  }

  const dateFrom = req.query?.date_from ? normalizeDate(req.query.date_from, "date_from") : null;
  if (dateFrom) {
    filters.push("t.work_date >= ?");
    params.push(dateFrom);
  }

  const dateTo = req.query?.date_to ? normalizeDate(req.query.date_to, "date_to") : null;
  if (dateTo) {
    filters.push("t.work_date <= ?");
    params.push(dateTo);
  }

  const page = parsePositiveInt(req.query?.page || req.query?.page_no, 1, 1000);
  const pageSize = parsePositiveInt(req.query?.pageSize || req.query?.page_size || req.query?.limit, 20, 100);
  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  let conn;
  try {
    conn = await pool.getConnection();

    const [[{ total }]] = await conn.query(
      `SELECT COUNT(*) AS total FROM timesheets t ${whereSql}`,
      params
    );

    const totalNumber = Number(total) || 0;
    const totalPages = totalNumber === 0 ? 1 : Math.ceil(totalNumber / pageSize);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const offset = (safePage - 1) * pageSize;

    const [rows] = await conn.query(
      `SELECT t.*, su.user_name AS staff_user_name, su.real_name AS staff_real_name,
              au.user_name AS approver_user_name, au.real_name AS approver_real_name,
              emp.signature_id AS employee_signature_id,
              mgr.signature_id AS manager_signature_id
         FROM timesheets t
         LEFT JOIN users su ON su.user_id = t.staff_user_id
         LEFT JOIN users au ON au.user_id = t.approved_by_user_id
         LEFT JOIN timesheet_signatures emp
                ON emp.timesheet_id = t.timesheet_id AND emp.signer_role = 'employee'
         LEFT JOIN timesheet_signatures mgr
                ON mgr.timesheet_id = t.timesheet_id AND mgr.signer_role = 'manager'
         ${whereSql}
         ORDER BY t.created_at DESC, t.timesheet_id DESC
         LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      ok: true,
      data: rows.map(mapTimesheetRow),
      meta: {
        total: totalNumber,
        page: safePage,
        pageSize,
        totalPages,
        hasMore: safePage < totalPages,
      },
    });
  } catch (err) {
    console.error("[timesheets.listTimesheets]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function getTimesheet(req, res) {
  const timesheetId = Number.parseInt(req.params.timesheetId, 10);
  if (!Number.isInteger(timesheetId) || timesheetId <= 0) {
    return res.status(400).json({ ok: false, error: "Valid timesheetId is required" });
  }

  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT t.*, su.user_name AS staff_user_name, su.real_name AS staff_real_name,
              au.user_name AS approver_user_name, au.real_name AS approver_real_name,
              emp.signature_id AS employee_signature_id,
              mgr.signature_id AS manager_signature_id
         FROM timesheets t
         LEFT JOIN users su ON su.user_id = t.staff_user_id
         LEFT JOIN users au ON au.user_id = t.approved_by_user_id
         LEFT JOIN timesheet_signatures emp
                ON emp.timesheet_id = t.timesheet_id AND emp.signer_role = 'employee'
         LEFT JOIN timesheet_signatures mgr
                ON mgr.timesheet_id = t.timesheet_id AND mgr.signer_role = 'manager'
        WHERE t.timesheet_id = ?
        LIMIT 1`,
      [timesheetId]
    );

    const row = rows[0];
    if (!row) {
      throw notFoundError("timesheet not found");
    }

    const summary = mapTimesheetRow(row);

    const [signRows] = await conn.query(
      `SELECT s.signature_id, s.signer_role, s.signed_by_user_id, s.signed_at,
              s.signature_mime_type, s.signature_blob, s.signature_sha256,
              u.user_name, u.real_name
         FROM timesheet_signatures s
         LEFT JOIN users u ON u.user_id = s.signed_by_user_id
        WHERE s.timesheet_id = ?`
      , [timesheetId]
    );

    const signatures = signRows.map((sign) => ({
      signature_id: sign.signature_id,
      signer_role: sign.signer_role,
      signed_by_user_id: sign.signed_by_user_id,
      signed_by_display_name: buildUserDisplay(sign),
      signed_at: sign.signed_at,
      signature_sha256: sign.signature_sha256,
      signature_data_url: `data:${sign.signature_mime_type};base64,${Buffer.from(sign.signature_blob).toString("base64")}`,
    }));

    res.json({ ok: true, data: { ...summary, signatures } });
  } catch (err) {
    if (err?.notFound) {
      return res.status(404).json({ ok: false, error: err.message });
    }
    console.error("[timesheets.getTimesheet]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function createTimesheet(req, res) {
  const payload = req.body || {};

  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const staffUserId = Number.parseInt(payload.staff_user_id, 10);
    if (!Number.isInteger(staffUserId) || staffUserId <= 0) {
      throw validationError("staff_user_id is required");
    }

    const [staffRows] = await conn.query(
      "SELECT user_id, user_name, real_name FROM users WHERE user_id=?",
      [staffUserId]
    );
    if (!staffRows.length) {
      throw validationError("staff_user_id references a non-existent user");
    }

    const workDate = normalizeDate(payload.work_date, "work_date");
    const startTime = normalizeTime(payload.start_time, "start_time", true);
    const endTime = normalizeTime(payload.end_time, "end_time", true);
    const location = normalizeOptionalString(payload.location, 100);
    const notes = payload.notes !== undefined ? payload.notes : null;
    const status = 'submitted';

    const totalMinutes = payload.total_minutes !== undefined && payload.total_minutes !== null && payload.total_minutes !== ""
      ? Number(payload.total_minutes)
      : calculateTotalMinutes(startTime, endTime);

    if (totalMinutes !== null && (!Number.isInteger(totalMinutes) || totalMinutes < -1440 || totalMinutes > 1440)) {
      throw validationError("total_minutes must be an integer between -1440 and 1440");
    }

    const [result] = await conn.query(
      `INSERT INTO timesheets (
          staff_user_id,
          work_date,
          start_time,
          end_time,
          total_minutes,
          location,
          notes,
          status,
          approved_by_user_id,
          approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [
        staffUserId,
        workDate,
        startTime,
        endTime,
        totalMinutes,
        location,
        notes,
        status,
        null,
        null,
      ]
    );

    const timesheetId = result.insertId;

    await conn.commit();

    try {
      await logOperation({
        req,
        action: "CREATE",
        entityType: "TIMESHEET",
        entityId: timesheetId,
        details: {
          timesheet_id: timesheetId,
          staff_user_id: staffUserId,
          work_date: workDate,
          status,
          total_minutes: totalMinutes,
        },
      });
    } catch (logErr) {
      console.error("[timesheets.createTimesheet][log]", logErr);
    }

    req.params.timesheetId = String(timesheetId);
    return getTimesheet(req, res);
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error("[timesheets.createTimesheet][rollback]", rollbackErr);
      }
    }
    if (err?.isValidation) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    console.error("[timesheets.createTimesheet]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function updateTimesheet(req, res) {
  const timesheetId = Number.parseInt(req.params.timesheetId, 10);
  if (!Number.isInteger(timesheetId) || timesheetId <= 0) {
    return res.status(400).json({ ok: false, error: "Valid timesheetId is required" });
  }

  const payload = req.body || {};

  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      "SELECT * FROM timesheets WHERE timesheet_id=?",
      [timesheetId]
    );
    const before = rows[0];
    if (!before) {
      throw notFoundError("timesheet not found");
    }

    const updates = [];
    const params = [];
    const changes = {};
    const userCache = new Map();

    if (Object.prototype.hasOwnProperty.call(payload, "work_date")) {
      const value = normalizeDate(payload.work_date, "work_date");
      if (value !== before.work_date) {
        updates.push("work_date=?");
        params.push(value);
        changes.work_date = { old: before.work_date, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "start_time")) {
      const value = normalizeTime(payload.start_time, "start_time", true);
      if (value !== before.start_time) {
        updates.push("start_time=?");
        params.push(value);
        changes.start_time = { old: before.start_time, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "end_time")) {
      const value = normalizeTime(payload.end_time, "end_time", true);
      if (value !== before.end_time) {
        updates.push("end_time=?");
        params.push(value);
        changes.end_time = { old: before.end_time, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "total_minutes")) {
      const value = payload.total_minutes === null || payload.total_minutes === ""
        ? null
        : Number(payload.total_minutes);
      if (value !== null && (!Number.isInteger(value) || value < -1440 || value > 1440)) {
        throw validationError("total_minutes must be between -1440 and 1440");
      }
      if (value !== before.total_minutes) {
        updates.push("total_minutes=?");
        params.push(value);
        changes.total_minutes = { old: before.total_minutes, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "location")) {
      const value = normalizeOptionalString(payload.location, 100);
      if (value !== before.location) {
        updates.push("location=?");
        params.push(value);
        changes.location = { old: before.location, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "notes")) {
      const value = payload.notes ?? null;
      if (String(value ?? "") !== String(before.notes ?? "")) {
        updates.push("notes=?");
        params.push(value);
        changes.notes = { old: before.notes, new: value };
      }
    }

    let statusChanged = false;
    let statusNewValue = before.status;
    if (Object.prototype.hasOwnProperty.call(payload, "status")) {
      const value = normalizeEnum(payload.status, TIMESHEET_STATUS, "status");
      if (value !== before.status) {
        updates.push("status=?");
        params.push(value);
        changes.status = { old: before.status, new: value };
        statusChanged = true;
        statusNewValue = value;
      }
    }

    let approvedByExplicit = false;
    if (Object.prototype.hasOwnProperty.call(payload, "approved_by_user_id")) {
      approvedByExplicit = true;
      const value = await resolveUser(conn, userCache, payload.approved_by_user_id, "approved_by_user_id");
      if (value !== before.approved_by_user_id) {
        updates.push("approved_by_user_id=?");
        params.push(value ?? null);
        updates.push("approved_at=?");
        params.push(value ? new Date() : null);
        changes.approved_by_user_id = { old: before.approved_by_user_id, new: value };
      }
    }

    if (statusChanged && !approvedByExplicit) {
      if (statusNewValue === "approved") {
        const approverId = Number(req?.jwt?.uid) || null;
        updates.push("approved_by_user_id=?");
        params.push(approverId);
        updates.push("approved_at=?");
        params.push(new Date());
        changes.approved_by_user_id = {
          old: before.approved_by_user_id,
          new: approverId,
        };
      } else if (before.status === "approved") {
        updates.push("approved_by_user_id=?");
        params.push(null);
        updates.push("approved_at=?");
        params.push(null);
        changes.approved_by_user_id = {
          old: before.approved_by_user_id,
          new: null,
        };
      }
    }

    if (!updates.length) {
      return getTimesheet(req, res);
    }

    updates.push("updated_at=CURRENT_TIMESTAMP");

    await conn.query(
      `UPDATE timesheets SET ${updates.join(", ")} WHERE timesheet_id=?`,
      [...params, timesheetId]
    );

    try {
      const changeKeys = Object.keys(changes);
      const action = changeKeys.length === 1 && changeKeys[0] === "status"
        ? "STATUS_CHANGE"
        : "UPDATE";
      await logOperation({
        req,
        action,
        entityType: "TIMESHEET",
        entityId: timesheetId,
        details: {
          timesheet_id: timesheetId,
          changes,
        },
      });
    } catch (logErr) {
      console.error("[timesheets.updateTimesheet][log]", logErr);
    }

    return getTimesheet(req, res);
  } catch (err) {
    if (err?.isValidation) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    if (err?.notFound) {
      return res.status(404).json({ ok: false, error: err.message });
    }
    console.error("[timesheets.updateTimesheet]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function signTimesheet(req, res) {
  const timesheetId = Number.parseInt(req.params.timesheetId, 10);
  if (!Number.isInteger(timesheetId) || timesheetId <= 0) {
    return res.status(400).json({ ok: false, error: "Valid timesheetId is required" });
  }

  const payload = req.body || {};
  const signerRole = normalizeEnum(payload.signer_role, SIGNER_ROLES, "signer_role");
  const { mimeType, buffer, sha256 } = parseSignatureDataUrl(payload.signature_data_url);

  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      "SELECT timesheet_id FROM timesheets WHERE timesheet_id=?",
      [timesheetId]
    );
    if (!rows.length) {
      throw notFoundError("timesheet not found");
    }

    const signerUserId = Number(req?.jwt?.uid) || null;

    await conn.query(
      `INSERT INTO timesheet_signatures (
          timesheet_id,
          signer_role,
          signed_by_user_id,
          signed_at,
          signature_mime_type,
          signature_blob,
          signature_sha256
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          signed_by_user_id = VALUES(signed_by_user_id),
          signed_at = CURRENT_TIMESTAMP,
          signature_mime_type = VALUES(signature_mime_type),
          signature_blob = VALUES(signature_blob),
          signature_sha256 = VALUES(signature_sha256)`,
      [timesheetId, signerRole, signerUserId, mimeType, buffer, sha256]
    );

    try {
      await logOperation({
        req,
        action: "UPDATE",
        entityType: "TIMESHEET",
        entityId: timesheetId,
        details: {
          timesheet_id: timesheetId,
          signer_role: signerRole,
          signature_sha256: sha256,
        },
      });
    } catch (logErr) {
      console.error("[timesheets.signTimesheet][log]", logErr);
    }

    return getTimesheet(req, res);
  } catch (err) {
    if (err?.isValidation) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    if (err?.notFound) {
      return res.status(404).json({ ok: false, error: err.message });
    }
    console.error("[timesheets.signTimesheet]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function listMyTimesheets(req, res) {
  const userId = Number(req?.jwt?.uid);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }

  req.query = {
    ...req.query,
    staff_user_id: String(userId),
  };
  return listTimesheets(req, res);
}

module.exports = {
  listTimesheets,
  listMyTimesheets,
  getTimesheet,
  createTimesheet,
  updateTimesheet,
  signTimesheet,
};
