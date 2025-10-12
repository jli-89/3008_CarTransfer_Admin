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

function buildUserDisplayName(userName, realName) {
  const trimmedReal = typeof realName === "string" ? realName.trim() : "";
  if (trimmedReal) {
    return trimmedReal;
  }
  const trimmedUser = typeof userName === "string" ? userName.trim() : "";
  return trimmedUser || null;
}

function parseNullableInteger(value, fieldName) {
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

async function resolveUserReference(conn, cache, value, fieldName) {
  const normalized = parseNullableInteger(value, fieldName);
  if (normalized === undefined || normalized === null) {
    return normalized ?? null;
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

function randomCodeSegment(length = 6) {
  return Math.random()
    .toString(16)
    .slice(2, 2 + length)
    .toUpperCase();
}

async function generateOrderCode(conn) {
  let attempt = 0;
  while (attempt < 10) {
    const code = `ORD-${Date.now().toString(36).toUpperCase()}-${randomCodeSegment(4)}`;
    const [rows] = await conn.query(
      "SELECT order_id FROM orders WHERE public_order_code=? LIMIT 1",
      [code]
    );
    if (!rows.length) {
      return code;
    }
    attempt += 1;
  }
  throw new Error("Unable to generate unique order code");
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
    officeLocation: "office_location",
    currentPerson: "current_person",
    previousPerson: "previous_person",
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

function normalizeNewItemPayload(payload = {}, index = 0) {
  const normalized = normalizeItemPayload(payload);
  const label = (field) => `items[${index}].${field}`;
  const result = {
    snap_plate_number: normalizeRequiredString(
      normalized.snap_plate_number,
      20,
      label("snap_plate_number")
    ),
    snap_vin: normalizeRequiredString(normalized.snap_vin, 50, label("snap_vin")),
    snap_maker: normalizeRequiredString(
      normalized.snap_maker,
      50,
      label("snap_maker")
    ),
    snap_model: normalizeRequiredString(
      normalized.snap_model,
      50,
      label("snap_model")
    ),
    snap_colour: normalizeRequiredString(
      normalized.snap_colour,
      30,
      label("snap_colour")
    ),
    pickup_location: normalizeRequiredString(
      normalized.pickup_location,
      100,
      label("pickup_location")
    ),
    delivery_location: normalizeRequiredString(
      normalized.delivery_location,
      100,
      label("delivery_location")
    ),
    transfer_status: normalizeItemStatus(normalized.transfer_status),
    transfer_note: normalizeNote(normalized.transfer_note),
  };
  const vehicleValue = normalizeDecimal(
    normalized.snap_vehicle_value,
    label("snap_vehicle_value")
  );
  result.snap_vehicle_value = vehicleValue === undefined ? null : vehicleValue;
  return result;
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
    office_location: row.office_location ?? null,
    first_contact: row.first_contact ?? null,
    first_contact_name: buildUserDisplayName(
      row.first_contact_user_name,
      row.first_contact_real_name
    ),
    current_person: row.current_person ?? null,
    current_person_name: buildUserDisplayName(
      row.current_person_user_name,
      row.current_person_real_name
    ),
    previous_person: row.previous_person ?? null,
    previous_person_name: buildUserDisplayName(
      row.previous_person_user_name,
      row.previous_person_real_name
    ),
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
              o.customer_phone, o.price_total, o.order_status, o.note, o.created_at,
              o.office_location, o.first_contact, o.current_person, o.previous_person,
              ufc.user_name AS first_contact_user_name,
              ufc.real_name AS first_contact_real_name,
              ucur.user_name AS current_person_user_name,
              ucur.real_name AS current_person_real_name,
              uprev.user_name AS previous_person_user_name,
              uprev.real_name AS previous_person_real_name
         FROM orders o
         LEFT JOIN users ufc ON ufc.user_id = o.first_contact
         LEFT JOIN users ucur ON ucur.user_id = o.current_person
         LEFT JOIN users uprev ON uprev.user_id = o.previous_person
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
// 更新訂單欄位（只允許白名單欄位），比對前後差異→決定 action（ASSIGN / STATUS_CHANGE / UPDATE）
//   →呼叫 logOperation。
//   注意 note：只有當 payload 帶了新 note 且與舊值不同時，才會「覆寫」資料庫的 note；
//     不會自動追加系統字串。


//640 875
async function updateOrder(req, res) {
  
  const orderId = Number.parseInt(req.params.orderId, 10);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res
      .status(400)
      .json({ ok: false, error: "Valid orderId parameter is required" });
  }

  const payload = normalizeOrderPayload(req.body || {});
  // << ADD LOG: raw payload before normalization step below
  console.log('[orders.updateOrder] payload (raw keys) =', Object.keys(req.body || {}));
  console.log('[orders.updateOrder] payload.note (raw) =', req.body ? req.body.note : undefined);

  const allowedFields = [
    "customer_name",
    "customer_email",
    "customer_phone",
    "price_total",
    "order_status",
    "note",
    "office_location",
    "current_person",
    "previous_person",
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
              customer_phone, price_total, order_status, note, created_at,
              office_location, first_contact, current_person, previous_person
         FROM orders WHERE order_id=?`,
      [orderId]
    );

    const before = rows[0];
    if (!before) {
      // << ADD LOG: record BEFORE values and raw incoming payload.note
      console.log('[orders.updateOrder] BEFORE.orderId =', orderId);
      console.log('[orders.updateOrder] BEFORE.note =', before.note);
      console.log('[orders.updateOrder] BEFORE.current_person =', before.current_person, 'previous_person =', before.previous_person);
      console.log('[orders.updateOrder] payload.note(raw from req.body) =', req.body ? req.body.note : undefined);

      throw notFoundError("order not found");
    }

    const updates = [];
    const params = [];
    const changes = {};
    const normalizedInputs = {};
    const userCache = new Map();

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

    // if (Object.prototype.hasOwnProperty.call(payload, "note")) {
    //   const value = normalizeNote(payload.note);
    //   normalizedInputs.note = value;
    //   if (!isSameValue(before.note, value)) {
    //     updates.push("note=?");
    //     params.push(value);
    //     changes.note = { old: before.note, new: value };
    //   }
    // }
    if (Object.prototype.hasOwnProperty.call(payload, "note")) {
  // normalize incoming note and log each step to help debugging
  const rawNote = payload.note;
  console.log('[orders.updateOrder] NOTE BLOCK: raw payload.note =', rawNote);

  const value = normalizeNote(payload.note);
  normalizedInputs.note = value;
  console.log('[orders.updateOrder] NOTE BLOCK: normalized note =', value);

  // compare using isSameValue and log the comparison result
  const same = isSameValue(before.note, value);
  console.log('[orders.updateOrder] NOTE BLOCK: isSameValue(before.note, normalized) =>', same);
  console.log('[orders.updateOrder] NOTE BLOCK: before.note (trimmed) =', (before.note||'').toString());
  console.log('[orders.updateOrder] NOTE BLOCK: new value (as will be stored) =', value);

  if (!same) {
    console.log('[orders.updateOrder] NOTE BLOCK: pushing note update; updates length before =', updates.length);
    updates.push("note=?");
    params.push(value);
    changes.note = { old: before.note, new: value };
    console.log('[orders.updateOrder] NOTE BLOCK: pushed note; updates length now =', updates.length);
  } else {
    console.log('[orders.updateOrder] NOTE BLOCK: not pushing note update because values considered same');
  }
}


    if (Object.prototype.hasOwnProperty.call(payload, "office_location")) {
      const value = normalizeOptionalString(payload.office_location, 100);
      normalizedInputs.office_location = value;
      if (!isSameValue(before.office_location, value)) {
        updates.push("office_location=?");
        params.push(value);
        changes.office_location = { old: before.office_location, new: value };
      }
    }



    if (Object.prototype.hasOwnProperty.call(payload, "current_person")) {
      const value = await resolveUserReference(
        conn,
        userCache,
        payload.current_person,
        "current_person"
      );
      normalizedInputs.current_person = value;
      if (!isSameValue(before.current_person, value)) {
        updates.push("current_person=?");
        params.push(value);
        changes.current_person = { old: before.current_person, new: value };
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "previous_person")) {
      const value = await resolveUserReference(
        conn,
        userCache,
        payload.previous_person,
        "previous_person"
      );
      normalizedInputs.previous_person = value;
      if (!isSameValue(before.previous_person, value)) {
        updates.push("previous_person=?");
        params.push(value);
        changes.previous_person = { old: before.previous_person, new: value };
      }
    }

    // if (!updates.length) {
    //   const itemsMap = await fetchOrderItemsMap(conn, [orderId]);
    //   const responseOrder = formatOrder(before, itemsMap.get(orderId) || []);
    //   return res.json({ ok: true, data: responseOrder, changes: 0 });
    // }
    if (!updates.length) {
      console.log('[orders.updateOrder] NO UPDATES -> early return; updates array empty, params =', params, 'changes =', changes);
      const itemsMap = await fetchOrderItemsMap(conn, [orderId]);
      const responseOrder = formatOrder(before, itemsMap.get(orderId) || []);
      return res.json({ ok: true, data: responseOrder, changes: 0 });
    }

    console.log('[orders.updateOrder] ABOUT TO RUN UPDATE; updates =', updates);
    console.log('[orders.updateOrder] ABOUT TO RUN UPDATE; params =', params, 'orderId=', orderId);

    await conn.query(
      `UPDATE orders SET ${updates.join(", ")} WHERE order_id=?`,
      [...params, orderId]
    );

    const [afterRows] = await conn.query(
      `SELECT o.order_id, o.public_order_code, o.customer_name, o.customer_email,
              o.customer_phone, o.price_total, o.order_status, o.note, o.created_at,
              o.office_location, o.first_contact, o.current_person, o.previous_person,
              ufc.user_name AS first_contact_user_name,
              ufc.real_name AS first_contact_real_name,
              ucur.user_name AS current_person_user_name,
              ucur.real_name AS current_person_real_name,
              uprev.user_name AS previous_person_user_name,
              uprev.real_name AS previous_person_real_name
         FROM orders o
         LEFT JOIN users ufc ON ufc.user_id = o.first_contact
         LEFT JOIN users ucur ON ucur.user_id = o.current_person
         LEFT JOIN users uprev ON uprev.user_id = o.previous_person
        WHERE o.order_id=?`,
      [orderId]
    );
    const after = afterRows[0];
    console.log('[orders.updateOrder] AFTER.note =', after ? after.note : undefined);
    console.log('[orders.updateOrder] AFTER.current_person =', after ? after.current_person : undefined, 'previous_person =', after ? after.previous_person : undefined);


    const itemsMap = await fetchOrderItemsMap(conn, [orderId]);
    const formatted = formatOrder(after, itemsMap.get(orderId) || []);

    const changeKeys = Object.keys(changes);
    const changeCount = changeKeys.length;
    if (changeCount) {
      const assignmentFields = new Set([
        "current_person",
        "previous_person",
      ]);
      const assignOnly = changeKeys.every((key) => assignmentFields.has(key));
      const action = assignOnly
        ? "ASSIGN"
        : changes.order_status && changeCount === 1
        ? "STATUS_CHANGE"
        : "UPDATE";
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
//建立訂單 + 多個訂單項目（一個交易內完成），
// 建立完成後呼叫 logOperation(action="CREATE") 寫入操作日誌。
// 注意 note 欄位：僅把前端傳進來的 note 原樣寫入（可為空）。
async function createOrder(req, res) {
  const body = req.body || {};
  const payload = normalizeOrderPayload(body);
  const itemsInput = Array.isArray(body.items) ? body.items : [];

  if (!itemsInput.length) {
    return res.status(400).json({ ok: false, error: "At least one item is required" });
  }

  const pool = getPool("orders");
  if (!pool) {
    return res.status(500).json({ ok: false, error: "Orders database not configured" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const customer_name = normalizeRequiredString(
      payload.customer_name,
      100,
      "customer_name"
    );
    const customer_email = normalizeRequiredString(
      payload.customer_email,
      255,
      "customer_email"
    );
    const customer_phone = normalizeRequiredString(
      payload.customer_phone,
      50,
      "customer_phone"
    );
    const order_status = payload.order_status
      ? normalizeOrderStatus(payload.order_status)
      : "AwaitingManualQuote";
    const note = normalizeNote(payload.note);
    const price_total =
      payload.price_total !== undefined
        ? normalizeDecimal(payload.price_total, "price_total")
        : null;
    const office_location =
      payload.office_location !== undefined
        ? normalizeOptionalString(payload.office_location, 100)
        : null;

    const userCache = new Map();
    const requesterUserId = Number(req.jwt?.uid);
    if (!Number.isInteger(requesterUserId) || requesterUserId <= 0) {
      throw validationError("first_contact requires an authenticated user");
    }
    const first_contact = await resolveUserReference(
      conn,
      userCache,
      requesterUserId,
      "first_contact"
    );
    const current_person = Object.prototype.hasOwnProperty.call(
      payload,
      "current_person"
    )
      ? await resolveUserReference(
          conn,
          userCache,
          payload.current_person,
          "current_person"
        )
      : null;
    const previous_person = Object.prototype.hasOwnProperty.call(
      payload,
      "previous_person"
    )
      ? await resolveUserReference(
          conn,
          userCache,
          payload.previous_person,
          "previous_person"
        )
      : null;

    let public_order_code = toNullableString(payload.public_order_code, 50);
    if (public_order_code) {
      const [rows] = await conn.query(
        "SELECT order_id FROM orders WHERE public_order_code=? LIMIT 1",
        [public_order_code]
      );
      if (rows.length) {
        throw validationError("public_order_code already exists");
      }
    } else {
      public_order_code = await generateOrderCode(conn);
    }

    const orderColumns = [
      "public_order_code",
      "customer_name",
      "customer_email",
      "customer_phone",
      "price_total",
      "order_status",
      "note",
      "office_location",
      "first_contact",
      "current_person",
      "previous_person",
    ];
    const orderValues = [
      public_order_code,
      customer_name,
      customer_email,
      customer_phone,
      price_total,
      order_status,
      note,
      office_location,
      first_contact,
      current_person,
      previous_person,
    ];

    const placeholders = orderColumns.map(() => "?").join(", ");
    const [orderResult] = await conn.query(
      `INSERT INTO orders (${orderColumns.join(", ")}) VALUES (${placeholders})`,
      orderValues
    );
    const orderId = orderResult.insertId;

    const createdItems = [];
    for (let i = 0; i < itemsInput.length; i += 1) {
      const item = normalizeNewItemPayload(itemsInput[i], i);
      const itemColumns = [
        "order_id",
        "snap_plate_number",
        "snap_vin",
        "snap_maker",
        "snap_model",
        "snap_colour",
        "snap_vehicle_value",
        "pickup_location",
        "delivery_location",
        "transfer_status",
        "transfer_note",
      ];
      const itemValues = [
        orderId,
        item.snap_plate_number,
        item.snap_vin,
        item.snap_maker,
        item.snap_model,
        item.snap_colour,
        item.snap_vehicle_value,
        item.pickup_location,
        item.delivery_location,
        item.transfer_status,
        item.transfer_note,
      ];
      const itemPlaceholders = itemColumns.map(() => "?").join(", ");
      const [itemResult] = await conn.query(
        `INSERT INTO order_items (${itemColumns.join(", ")}) VALUES (${itemPlaceholders})`,
        itemValues
      );
      createdItems.push({ ...item, item_id: itemResult.insertId });
    }

    const [orderRows] = await conn.query(
      `SELECT o.order_id, o.public_order_code, o.customer_name, o.customer_email,
              o.customer_phone, o.price_total, o.order_status, o.note, o.created_at,
              o.office_location, o.first_contact, o.current_person, o.previous_person,
              ufc.user_name AS first_contact_user_name,
              ufc.real_name AS first_contact_real_name,
              ucur.user_name AS current_person_user_name,
              ucur.real_name AS current_person_real_name,
              uprev.user_name AS previous_person_user_name,
              uprev.real_name AS previous_person_real_name
         FROM orders o
         LEFT JOIN users ufc ON ufc.user_id = o.first_contact
         LEFT JOIN users ucur ON ucur.user_id = o.current_person
         LEFT JOIN users uprev ON uprev.user_id = o.previous_person
        WHERE o.order_id = ?`,
      [orderId]
    );

    await conn.commit();

    const inserted = orderRows[0];
    const itemsMap = await fetchOrderItemsMap(conn, [orderId]);
    const formatted = formatOrder(inserted, itemsMap.get(orderId) || []);

    try {
      await logOperation({
        req,
        action: "CREATE",
        entityType: "ORDER",
        entityId: orderId,
        orderId,
        details: {
          order_id: orderId,
          public_order_code,
          created: {
            order: {
              customer_name,
              customer_email,
              customer_phone,
              price_total,
              order_status,
              note,
              office_location,
              first_contact,
              current_person,
              previous_person,
            },
            items: createdItems.map((item) => ({
              item_id: item.item_id,
              transfer_status: item.transfer_status,
              pickup_location: item.pickup_location,
              delivery_location: item.delivery_location,
            })),
          },
        },
      });
    } catch (logErr) {
      console.error("[orders.createOrder][logOperation]", logErr);
    }

    res.status(201).json({ ok: true, data: formatted });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error("[orders.createOrder][rollback]", rollbackErr);
      }
    }
    if (err?.isValidation) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    console.error("[orders.createOrder]", err);
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
//更新單一訂單項；若狀態改變，會落表 transfer_status_history，並以 ITEM 寫操作日誌。
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
//updateItem(req, res) / updateItemStatus(req, res)：更新單一訂單項；若狀態改變，會落表 transfer_status_history，並以 ITEM 寫操作日誌。
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
  createOrder,
  updateOrder,
  updateItem,
  updateItemStatus,
};

