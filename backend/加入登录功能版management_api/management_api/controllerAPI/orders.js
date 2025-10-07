// controllerAPI/orders.js
const { getPool } = require("../database");
const { logOperation } = require("../operation-logger");

const ORDER_STATUS_VALUES = new Set([
  "AwaitingManualQuote",
  "Quoted",
  "Paid",
  "Completed",
  "Cancelled",
]);

const ITEM_STATUS_VALUES = new Set([
  "AwaitingPickup",
  "PickedUp",
  "InTransit",
  "AtDestinationDepot",
  "OutForDelivery",
  "DeliveredToCustomer",
  "DeliveredRefused",
  "Incident",
  "Other",
]);

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return String(value).split(",");
}

function matchEnumIgnoreCase(value, allowedSet) {
  if (!value) {
    return null;
  }
  const upper = String(value).trim().toUpperCase();
  for (const option of allowedSet) {
    if (option.toUpperCase() === upper) {
      return option;
    }
  }
  return null;
}

function parseStatusList(value, allowedSet) {
  const result = [];
  const seen = new Set();
  for (const entry of toArray(value)) {
    const match = matchEnumIgnoreCase(entry, allowedSet);
    if (match && !seen.has(match)) {
      result.push(match);
      seen.add(match);
    }
  }
  return result;
}

function toNullableString(value, maxLength) {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  if (!str) {
    return null;
  }
  return maxLength && str.length > maxLength ? str.slice(0, maxLength) : str;
}

function parseSearchTerm(value) {
  return toNullableString(value, 255);
}

function parseDateFilter(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  if (!str) {
    return null;
  }
  const timestamp = Date.parse(str);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  if (str.length > 10) {
    return str.slice(0, 19).replace("T", " ");
  }
  return str;
}

function parseDecimalFilter(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return null;
  }
  return numberValue;
}

function parsePage(queryValue) {
  const parsed = Number.parseInt(queryValue, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}

function parsePageSize(queryValue) {
  const parsed = Number.parseInt(queryValue, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(parsed, MAX_PAGE_SIZE);
  }
  return DEFAULT_PAGE_SIZE;
}

function buildOrderFilters(query = {}) {
  const conditions = [];
  const params = [];

  const statuses = parseStatusList(query.status ?? query.order_status, ORDER_STATUS_VALUES);
  if (statuses.length) {
    conditions.push(`o.order_status IN (${statuses.map(() => "?").join(",")})`);
    params.push(...statuses);
  }

  const itemStatuses = parseStatusList(query.itemStatus ?? query.item_status, ITEM_STATUS_VALUES);
  if (itemStatuses.length) {
    conditions.push(`EXISTS (
      SELECT 1
        FROM order_items oi
       WHERE oi.order_id = o.order_id
         AND oi.transfer_status IN (${itemStatuses.map(() => "?").join(",")})
    )`);
    params.push(...itemStatuses);
  }

  const code = toNullableString(query.code ?? query.order_code, 50);
  if (code) {
    conditions.push("o.public_order_code = ?");
    params.push(code);
  }

  const search = parseSearchTerm(query.search ?? query.q ?? query.keyword ?? null);
  if (search) {
    const like = `%${search}%`;
    conditions.push(`(
      o.public_order_code LIKE ? OR
      o.customer_name LIKE ? OR
      o.customer_email LIKE ? OR
      o.customer_phone LIKE ?
    )`);
    params.push(like, like, like, like);
  }

  const dateFrom = parseDateFilter(query.date_from ?? query.from ?? null);
  if (dateFrom) {
    conditions.push("o.created_at >= ?");
    params.push(dateFrom);
  }

  const dateTo = parseDateFilter(query.date_to ?? query.to ?? null);
  if (dateTo) {
    conditions.push("o.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(dateTo);
  }

  const minTotal = parseDecimalFilter(query.min_total ?? query.minTotal ?? null);
  if (minTotal !== null) {
    conditions.push("o.price_total >= ?");
    params.push(minTotal);
  }

  const maxTotal = parseDecimalFilter(query.max_total ?? query.maxTotal ?? null);
  if (maxTotal !== null) {
    conditions.push("o.price_total <= ?");
    params.push(maxTotal);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { whereSql, params };
}

function isSameValue(oldVal, newVal) {
  if (oldVal === null || oldVal === undefined) {
    return newVal === null || newVal === undefined;
  }
  if (newVal === null || newVal === undefined) {
    return false;
  }
  return String(oldVal) === String(newVal);
}

function normalizeOrderPayload(payload = {}) {
  const aliasMap = {
    customerName: "customer_name",
    customerEmail: "customer_email",
    customerPhone: "customer_phone",
    priceTotal: "price_total",
    orderStatus: "order_status",
  };

  const normalized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) {
      continue;
    }
    const targetKey = aliasMap[key] || key;
    normalized[targetKey] = value;
  }
  return normalized;
}

function normalizeItemPayload(payload = {}) {
  const aliasMap = {
    transferStatus: "transfer_status",
    transferNote: "transfer_note",
    pickupLocation: "pickup_location",
    deliveryLocation: "delivery_location",
    snapPlateNumber: "snap_plate_number",
    snapVin: "snap_vin",
    snapMaker: "snap_maker",
    snapModel: "snap_model",
    snapColour: "snap_colour",
    snapVehicleValue: "snap_vehicle_value",
  };

  const normalized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) {
      continue;
    }
    const targetKey = aliasMap[key] || key;
    normalized[targetKey] = value;
  }
  if (Object.prototype.hasOwnProperty.call(normalized, "note") &&
      !Object.prototype.hasOwnProperty.call(normalized, "transfer_note")) {
    normalized.transfer_note = normalized.note;
  }
  delete normalized.note;
  return normalized;
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

function normalizeDecimal(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw validationError(`${fieldName} must be a non-negative number`);
  }
  return numberValue.toFixed(2);
}

function normalizeOrderStatus(value) {
  const status = matchEnumIgnoreCase(value, ORDER_STATUS_VALUES);
  if (!status) {
    throw validationError("order_status is invalid");
  }
  return status;
}

function normalizeItemStatus(value) {
  const status = matchEnumIgnoreCase(value, ITEM_STATUS_VALUES);
  if (!status) {
    throw validationError("transfer_status is invalid");
  }
  return status;
}

function normalizeNote(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const str = String(value).trim();
  return str.length ? str : null;
}

function toISOString(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function formatItem(row) {
  return {
    item_id: row.item_id,
    order_id: row.order_id,
    snap_plate_number: row.snap_plate_number,
    snap_vin: row.snap_vin,
    snap_maker: row.snap_maker,
    snap_model: row.snap_model,
    snap_colour: row.snap_colour,
    snap_vehicle_value:
      row.snap_vehicle_value !== null && row.snap_vehicle_value !== undefined
        ? Number(row.snap_vehicle_value)
        : null,
    pickup_location: row.pickup_location,
    delivery_location: row.delivery_location,
    transfer_status: row.transfer_status,
    transfer_note: row.transfer_note,
  };
}

function formatOrder(row, items) {
  return {
    order_id: row.order_id,
    public_order_code: row.public_order_code,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    price_total:
      row.price_total !== null && row.price_total !== undefined
        ? Number(row.price_total)
        : null,
    order_status: row.order_status,
    note: row.note ?? null,
    created_at: toISOString(row.created_at),
    items,
  };
}

async function fetchOrderItemsMap(conn, orderIds) {
  if (!orderIds.length) {
    return new Map();
  }
  const [rows] = await conn.query(
    `SELECT item_id, order_id, snap_plate_number, snap_vin, snap_maker, snap_model,
            snap_colour, snap_vehicle_value, pickup_location, delivery_location,
            transfer_status, transfer_note
       FROM order_items
      WHERE order_id IN (?)
      ORDER BY order_id DESC, item_id ASC`,
    [orderIds]
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.order_id)) {
      map.set(row.order_id, []);
    }
    map.get(row.order_id).push(formatItem(row));
  }
  return map;
}

// GET /api/orders
async function listOrders(req, res) {
  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  const page = parsePage(req.query?.page);
  const pageSize = parsePageSize(req.query?.pageSize ?? req.query?.limit);
  const { whereSql, params } = buildOrderFilters(req.query || {});

  let conn;
  try {
    conn = await pool.getConnection();

    const [[{ total }]] = await conn.query(
      `SELECT COUNT(*) AS total FROM orders o ${whereSql}`,
      params
    );

    const totalNumber = Number(total) || 0;
    const totalPages = totalNumber === 0 ? 1 : Math.ceil(totalNumber / pageSize);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const offset = (safePage - 1) * pageSize;

    const [orderRows] = await conn.query(
      `SELECT o.order_id, o.public_order_code, o.customer_name, o.customer_email,
              o.customer_phone, o.price_total, o.order_status, o.note, o.created_at
         FROM orders o
         ${whereSql}
         ORDER BY o.created_at DESC, o.order_id DESC
         LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const orderIds = orderRows.map((row) => row.order_id);
    const itemsMap = await fetchOrderItemsMap(conn, orderIds);

    const orders = orderRows.map((row) =>
      formatOrder(row, itemsMap.get(row.order_id) || [])
    );

    res.json({
      ok: true,
      data: orders,
      meta: {
        total: totalNumber,
        page: safePage,
        pageSize,
        totalPages,
        hasMore: safePage * pageSize < totalNumber,
      },
    });
  } catch (err) {
    console.error("[orders.listOrders]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

// GET /api/meta/transfer-status-options
async function getTransferStatusOptions(req, res) {
  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      "SHOW COLUMNS FROM order_items LIKE 'transfer_status'"
    );
    const type = rows[0]?.Type || "";
    const match = type.match(/enum\((.*)\)/i);
    let options = [];
    if (match) {
      options = match[1]
        .split(/,(?=(?:[^']*'[^']*')*[^']*$)/)
        .map((part) => part.trim().replace(/^'/, "").replace(/'$/, ""));
    }
    res.json({ ok: true, data: options });
  } catch (err) {
    console.error("[orders.getTransferStatusOptions]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function updateOrder(req, res) {
  const orderId = Number.parseInt(req.params.orderId, 10);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res
      .status(400)
      .json({ ok: false, error: "Valid orderId parameter is required" });
  }

  const payload = normalizeOrderPayload(req.body || {});
  const allowedFields = [
    "customer_name",
    "customer_email",
    "customer_phone",
    "price_total",
    "order_status",
    "note",
  ];

  if (!allowedFields.some((field) => Object.prototype.hasOwnProperty.call(payload, field))) {
    return res
      .status(400)
      .json({ ok: false, error: "No order fields provided for update" });
  }

  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT order_id, public_order_code, customer_name, customer_email,
              customer_phone, price_total, order_status, note, created_at
         FROM orders WHERE order_id=?`,
      [orderId]
    );

    const before = rows[0];
    if (!before) {
      throw notFoundError("order not found");
    }

    const updates = [];
    const params = [];
    const changes = {};
    const normalizedInputs = {};

    if (Object.prototype.hasOwnProperty.call(payload, "customer_name")) {
      const value = normalizeRequiredString(payload.customer_name, 100, "customer_name");
      normalizedInputs.customer_name = value;
      if (!isSameValue(before.customer_name, value)) {
        updates.push("customer_name=?");
        params.push(value);
        changes.customer_name = { old: before.customer_name, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "customer_email")) {
      const value = normalizeRequiredString(payload.customer_email, 255, "customer_email");
      normalizedInputs.customer_email = value;
      if (!isSameValue(before.customer_email, value)) {
        updates.push("customer_email=?");
        params.push(value);
        changes.customer_email = { old: before.customer_email, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "customer_phone")) {
      const value = normalizeRequiredString(payload.customer_phone, 50, "customer_phone");
      normalizedInputs.customer_phone = value;
      if (!isSameValue(before.customer_phone, value)) {
        updates.push("customer_phone=?");
        params.push(value);
        changes.customer_phone = { old: before.customer_phone, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "price_total")) {
      const value = normalizeDecimal(payload.price_total, "price_total");
      normalizedInputs.price_total = value;
      if (!isSameValue(before.price_total, value)) {
        updates.push("price_total=?");
        params.push(value);
        changes.price_total = { old: before.price_total, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "order_status")) {
      const value = normalizeOrderStatus(payload.order_status);
      normalizedInputs.order_status = value;
      if (!isSameValue(before.order_status, value)) {
        updates.push("order_status=?");
        params.push(value);
        changes.order_status = { old: before.order_status, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "note")) {
      const value = normalizeNote(payload.note);
      normalizedInputs.note = value;
      if (!isSameValue(before.note, value)) {
        updates.push("note=?");
        params.push(value);
        changes.note = { old: before.note, new: value };
      }
    }

    if (!updates.length) {
      const itemsMap = await fetchOrderItemsMap(conn, [orderId]);
      const responseOrder = formatOrder(before, itemsMap.get(orderId) || []);
      return res.json({ ok: true, data: responseOrder, changes: 0 });
    }

    await conn.query(
      `UPDATE orders SET ${updates.join(", ")} WHERE order_id=?`,
      [...params, orderId]
    );

    const [afterRows] = await conn.query(
      `SELECT order_id, public_order_code, customer_name, customer_email,
              customer_phone, price_total, order_status, note, created_at
         FROM orders WHERE order_id=?`,
      [orderId]
    );
    const after = afterRows[0];

    const itemsMap = await fetchOrderItemsMap(conn, [orderId]);
    const formatted = formatOrder(after, itemsMap.get(orderId) || []);

    const changeCount = Object.keys(changes).length;
    if (changeCount) {
      const action =
        changes.order_status && changeCount === 1 ? "STATUS_CHANGE" : "UPDATE";
      try {
        await logOperation({
          req,
          action,
          entityType: "ORDER",
          entityId: orderId,
          orderId,
          details: {
            order_id: orderId,
            public_order_code: after.public_order_code,
            changes,
          },
        });
      } catch (logErr) {
        console.error("[orders.updateOrder][logOperation]", logErr);
      }
    }

    res.json({ ok: true, data: formatted, changes: changeCount });
  } catch (err) {
    if (err?.isValidation) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    if (err?.notFound) {
      return res.status(404).json({ ok: false, error: err.message });
    }
    console.error("[orders.updateOrder]", err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function applyItemMutation(req, { itemId, payload, allowedFields = null }) {
  if (!Number.isFinite(itemId) || itemId <= 0) {
    throw validationError("Valid itemId parameter is required");
  }

  const normalizedPayload = normalizeItemPayload(payload || {});
  if (allowedFields) {
    for (const key of Object.keys(normalizedPayload)) {
      if (!allowedFields.includes(key)) {
        delete normalizedPayload[key];
      }
    }
  }

  if (!Object.keys(normalizedPayload).length) {
    throw validationError("No item fields provided for update");
  }

  const pool = getPool("orders");
  if (!pool) {
    throw new Error("Orders database not configured");
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT i.*, o.public_order_code
         FROM order_items i
         LEFT JOIN orders o ON o.order_id = i.order_id
        WHERE i.item_id = ?`,
      [itemId]
    );

    const before = rows[0];
    if (!before) {
      throw notFoundError("item not found");
    }

    const updates = [];
    const params = [];
    const changes = {};
    const normalizedInputs = {};

    for (const [field, rawValue] of Object.entries(normalizedPayload)) {
      if (rawValue === undefined) {
        continue;
      }
      let normalized;
      switch (field) {
        case "pickup_location":
          normalized = normalizeRequiredString(rawValue, 100, "pickup_location");
          break;
        case "delivery_location":
          normalized = normalizeRequiredString(rawValue, 100, "delivery_location");
          break;
        case "transfer_status":
          normalized = normalizeItemStatus(rawValue);
          break;
        case "transfer_note":
          normalized = normalizeNote(rawValue);
          break;
        case "snap_plate_number":
          normalized = normalizeOptionalString(rawValue, 50);
          break;
        case "snap_vin":
          normalized = normalizeOptionalString(rawValue, 50);
          break;
        case "snap_maker":
          normalized = normalizeOptionalString(rawValue, 50);
          break;
        case "snap_model":
          normalized = normalizeOptionalString(rawValue, 50);
          break;
        case "snap_colour":
          normalized = normalizeOptionalString(rawValue, 30);
          break;
        case "snap_vehicle_value":
          normalized = normalizeDecimal(rawValue, "snap_vehicle_value");
          break;
        default:
          continue;
      }

      normalizedInputs[field] = normalized;
      if (!isSameValue(before[field], normalized)) {
        updates.push(`${field}=?`);
        params.push(normalized);
        changes[field] = { old: before[field], new: normalized };
      }
    }

    if (!updates.length) {
      return {
        item: formatItem(before),
        changeCount: 0,
        orderCode: before.public_order_code || null,
      };
    }

    await conn.query(
      `UPDATE order_items SET ${updates.join(", ")} WHERE item_id=?`,
      [...params, itemId]
    );

    if (changes.transfer_status) {
      const noteForHistory =
        normalizedInputs.transfer_note !== undefined
          ? normalizedInputs.transfer_note
          : null;
      const changedBy = Number(req?.jwt?.uid) || null;
      try {
        await conn.query(
          `INSERT INTO transfer_status_history (item_id, old_status, new_status, note, changed_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            itemId,
            before.transfer_status || null,
            normalizedInputs.transfer_status,
            noteForHistory,
            changedBy,
          ]
        );
      } catch (historyErr) {
        console.error(
          "[orders.applyItemMutation] transfer_status_history failed:",
          historyErr.message
        );
      }
    }

    const [afterRows] = await conn.query(
      `SELECT i.*, o.public_order_code
         FROM order_items i
         LEFT JOIN orders o ON o.order_id = i.order_id
        WHERE i.item_id = ?`,
      [itemId]
    );
    const after = afterRows[0];

    const formattedItem = formatItem(after);
    const changeCount = Object.keys(changes).length;

    if (changeCount) {
      const action = changes.transfer_status ? "STATUS_CHANGE" : "UPDATE";
      try {
        await logOperation({
          req,
          action,
          entityType: "ITEM",
          entityId: after.item_id,
          orderId: after.order_id,
          details: {
            order_id: after.order_id,
            item_id: after.item_id,
            public_order_code: after.public_order_code || null,
            changes,
          },
        });
      } catch (logErr) {
        console.error("[orders.applyItemMutation][logOperation]", logErr);
      }
    }

    return {
      item: formattedItem,
      changeCount,
      orderCode: after.public_order_code || null,
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function updateItem(req, res) {
  const itemId = Number.parseInt(req.params.itemId, 10);
  try {
    const { item, changeCount } = await applyItemMutation(req, {
      itemId,
      payload: req.body || {},
    });
    res.json({ ok: true, data: item, changes: changeCount });
  } catch (err) {
    if (err?.isValidation) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    if (err?.notFound) {
      return res.status(404).json({ ok: false, error: err.message });
    }
    console.error("[orders.updateItem]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

// PUT /api/items/:itemId/transfer_status { transfer_status, note }
async function updateItemStatus(req, res) {
  const itemId = Number.parseInt(req.params.itemId, 10);
  const payload = {
    transfer_status: req.body?.transfer_status,
    transfer_note:
      req.body?.transfer_note !== undefined
        ? req.body.transfer_note
        : req.body?.note,
  };

  try {
    const { item, changeCount } = await applyItemMutation(req, {
      itemId,
      payload,
      allowedFields: ["transfer_status", "transfer_note"],
    });

    res.json({
      ok: true,
      item_id: item.item_id,
      transfer_status: item.transfer_status,
      transfer_note: item.transfer_note,
      changes: changeCount,
    });
  } catch (err) {
    if (err?.isValidation) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    if (err?.notFound) {
      return res.status(404).json({ ok: false, error: err.message });
    }
    console.error("[orders.updateItemStatus]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  listOrders,
  getTransferStatusOptions,
  updateOrder,
  updateItem,
  updateItemStatus,
};
