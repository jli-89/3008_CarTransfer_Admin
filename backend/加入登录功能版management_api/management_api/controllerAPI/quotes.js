const { getPool } = require("../database");
const { logOperation } = require("../operation-logger");

const LOCATION_ENTITY = "LOCATION";
const ROUTE_PRICE_ENTITY = "ROUTE_PRICE";

function toUnsignedInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return Math.trunc(num);
}

function toNullableUnsignedInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return null;
  }
  return Math.trunc(num);
}

function pickBodyOrParam(req, bodyKey, paramKey) {
  if (paramKey && req.params && req.params[paramKey] !== undefined) {
    return req.params[paramKey];
  }
  if (bodyKey && req.body && req.body[bodyKey] !== undefined) {
    return req.body[bodyKey];
  }
  if (!bodyKey && paramKey && req.body && req.body[paramKey] !== undefined) {
    return req.body[paramKey];
  }
  return undefined;
}

function formatLocationDetails(row) {
  if (!row) {
    return null;
  }
  return `location ${row.location_id} ${row.city_name}, ${row.state_code} ${row.postcode}`;
}

function formatRouteSummary(row) {
  if (!row) {
    return null;
  }
  const parts = [
    `route ${row.price_id}`,
    `pickup=${row.pickup_id}`,
    `delivery=${row.delivery_id}`,
    `vehicleType=${row.vehicle_type_id}`,
  ];
  if (row.price !== undefined && row.price !== null) {
    parts.push(`price=${row.price}`);
  }
  if (row.transit_days !== undefined && row.transit_days !== null) {
    parts.push(`transitDays=${row.transit_days}`);
  }
  if (row.is_backload !== undefined && row.is_backload !== null) {
    parts.push(`backload=${row.is_backload ? 1 : 0}`);
  }
  return parts.join(" ");
}

async function listLocations(req, res) {
  try {
    const pool = getPool("quotes");
    const [rows] = await pool.query(
      "SELECT location_id, city_name, state_code, postcode FROM locations ORDER BY city_name"
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function createLocation(req, res) {
  const { city_name, state_code, postcode } = req.body || {};
  if (!city_name || !state_code || !postcode) {
    return res.status(400).json({ ok: false, error: "city_name, state_code, postcode are required" });
  }

  try {
    const pool = getPool("quotes");
    const [result] = await pool.query(
      "INSERT INTO locations (city_name, state_code, postcode) VALUES (?, ?, ?)",
      [city_name.trim(), state_code.trim(), postcode.trim()]
    );

    await logOperation({
      req,
      action: "CREATE",
      entityType: LOCATION_ENTITY,
      entityId: result.insertId,
      details: `Created ${formatLocationDetails({
        location_id: result.insertId,
        city_name: city_name.trim(),
        state_code: state_code.trim(),
        postcode: postcode.trim(),
      })}`,
    });

    res.json({ ok: true, location_id: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateLocation(req, res) {
  const locationIdRaw = pickBodyOrParam(req, "location_id", "locationId");
  const location_id = toUnsignedInt(locationIdRaw);
  const { city_name, state_code, postcode } = req.body || {};

  if (!location_id || !city_name || !state_code || !postcode) {
    return res.status(400).json({ ok: false, error: "location_id, city_name, state_code, postcode are required" });
  }

  try {
    const pool = getPool("quotes");
    const [result] = await pool.query(
      "UPDATE locations SET city_name=?, state_code=?, postcode=? WHERE location_id=?",
      [city_name.trim(), state_code.trim(), postcode.trim(), location_id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: "Location not found" });
    }

    await logOperation({
      req,
      action: "UPDATE",
      entityType: LOCATION_ENTITY,
      entityId: location_id,
      details: `Updated ${formatLocationDetails({
        location_id,
        city_name: city_name.trim(),
        state_code: state_code.trim(),
        postcode: postcode.trim(),
      })}`,
    });

    res.json({ ok: true, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function deleteLocation(req, res) {
  const locationIdRaw = pickBodyOrParam(req, null, "locationId");
  const location_id = toUnsignedInt(locationIdRaw);
  if (!location_id) {
    return res.status(400).json({ ok: false, error: "locationId is required" });
  }

  try {
    const pool = getPool("quotes");
    const [[usage]] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM route_prices WHERE pickup_id=? OR delivery_id=?",
      [location_id, location_id]
    );
    if (usage.cnt > 0) {
      return res.status(409).json({ ok: false, error: "Location is used by existing route prices" });
    }

    const [result] = await pool.query("DELETE FROM locations WHERE location_id=?", [location_id]);
    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: "Location not found" });
    }

    await logOperation({
      req,
      action: "DELETE",
      entityType: LOCATION_ENTITY,
      entityId: location_id,
      details: `Deleted location ${location_id}`,
    });

    res.json({ ok: true, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listVehicleTypes(req, res) {
  try {
    const [rows] = await getPool("quotes").query(
      "SELECT vehicle_type_id, type_code, description FROM vehicle_types ORDER BY vehicle_type_id"
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function listRoutePrices(req, res) {
  try {
    const { pickup_id, delivery_id, vehicle_type_id, is_backload } = req.query || {};
    const sql = [];
    const args = [];

    if (pickup_id) {
      sql.push("rp.pickup_id=?");
      args.push(pickup_id);
    }
    if (delivery_id) {
      sql.push("rp.delivery_id=?");
      args.push(delivery_id);
    }
    if (vehicle_type_id) {
      sql.push("rp.vehicle_type_id=?");
      args.push(vehicle_type_id);
    }
    if (is_backload !== undefined) {
      sql.push("rp.is_backload=?");
      args.push(Number(is_backload) ? 1 : 0);
    }

    const where = sql.length ? `WHERE ${sql.join(" AND ")}` : "";

    const [rows] = await getPool("quotes").query(
      `SELECT rp.price_id,
              rp.pickup_id,
              p.city_name AS pickup_city,
              rp.delivery_id,
              d.city_name AS delivery_city,
              rp.vehicle_type_id,
              vt.type_code,
              rp.price,
              rp.transit_days,
              rp.is_backload,
              rp.created_at
         FROM route_prices rp
         JOIN locations p ON p.location_id = rp.pickup_id
         JOIN locations d ON d.location_id = rp.delivery_id
         JOIN vehicle_types vt ON vt.vehicle_type_id = rp.vehicle_type_id
        ${where}
        ORDER BY rp.created_at DESC, rp.price_id DESC`,
      args
    );

    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function createRoutePrice(req, res) {
  const { pickup_id, delivery_id, vehicle_type_id } = req.body || {};
  const price = Number(req.body?.price);
  const transit_days = toNullableUnsignedInt(req.body?.transit_days);
  const is_backload = req.body?.is_backload ? 1 : 0;

  const pickupId = toUnsignedInt(pickup_id);
  const deliveryId = toUnsignedInt(delivery_id);
  const vehicleTypeId = toUnsignedInt(vehicle_type_id);

  if (!pickupId || !deliveryId || !vehicleTypeId || !Number.isFinite(price)) {
    return res
      .status(400)
      .json({ ok: false, error: "pickup_id, delivery_id, vehicle_type_id, price are required" });
  }

  try {
    const pool = getPool("quotes");
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query(
        "SELECT price_id FROM route_prices WHERE pickup_id=? AND delivery_id=? AND vehicle_type_id=? LIMIT 1",
        [pickupId, deliveryId, vehicleTypeId]
      );
      if (existing.length) {
        await conn.rollback();
        return res.status(409).json({ ok: false, error: "Route price already exists" });
      }

      const [result] = await conn.query(
        "INSERT INTO route_prices (pickup_id, delivery_id, vehicle_type_id, price, transit_days, is_backload) VALUES (?, ?, ?, ?, ?, ?)",
        [pickupId, deliveryId, vehicleTypeId, price, transit_days, is_backload]
      );
      await conn.commit();

      await logOperation({
        req,
        action: "CREATE",
        entityType: ROUTE_PRICE_ENTITY,
        entityId: result.insertId,
        details: `Created ${formatRouteSummary({
          price_id: result.insertId,
          pickup_id: pickupId,
          delivery_id: deliveryId,
          vehicle_type_id: vehicleTypeId,
          price,
          transit_days,
          is_backload,
        })}`,
      });

      res.json({ ok: true, price_id: result.insertId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function resolveRoutePriceId(pool, { price_id, pickup_id, delivery_id, vehicle_type_id }) {
  if (price_id !== undefined && price_id !== null) {
    const lookupId = toUnsignedInt(price_id);
    if (lookupId) {
      return lookupId;
    }
  }
  if (pickup_id && delivery_id && vehicle_type_id) {
    const pickupId = toUnsignedInt(pickup_id);
    const deliveryId = toUnsignedInt(delivery_id);
    const vehicleTypeId = toUnsignedInt(vehicle_type_id);
    if (pickupId && deliveryId && vehicleTypeId) {
      const [rows] = await pool.query(
        "SELECT price_id FROM route_prices WHERE pickup_id=? AND delivery_id=? AND vehicle_type_id=? LIMIT 1",
        [pickupId, deliveryId, vehicleTypeId]
      );
      if (rows.length) {
        return rows[0].price_id;
      }
    }
  }
  return null;
}

async function loadRouteSummary(pool, price_id) {
  const [rows] = await pool.query(
    "SELECT price_id, pickup_id, delivery_id, vehicle_type_id, price, transit_days, is_backload FROM route_prices WHERE price_id=?",
    [price_id]
  );
  return rows.length ? rows[0] : null;
}

async function updateRoutePrice(req, res) {
  const pool = getPool("quotes");
  try {
    const priceId = await resolveRoutePriceId(pool, {
    price_id: pickBodyOrParam(req, "price_id", "priceId"),
    pickup_id: pickBodyOrParam(req, "pickup_id", "pickupId"),
    delivery_id: pickBodyOrParam(req, "delivery_id", "deliveryId"),
    vehicle_type_id: pickBodyOrParam(req, "vehicle_type_id", "vehicleTypeId"),
  });
    if (!priceId) {
      return res.status(404).json({ ok: false, error: "Route price not found" });
    }

    const price = Number(req.body?.price);
    if (!Number.isFinite(price)) {
      return res.status(400).json({ ok: false, error: "price is required" });
    }
    const transit_days = toNullableUnsignedInt(req.body?.transit_days);

    const [result] = await pool.query(
      "UPDATE route_prices SET price=?, transit_days=? WHERE price_id=?",
      [price, transit_days, priceId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: "Route price not found" });
    }

    const summary = await loadRouteSummary(pool, priceId);
    await logOperation({
      req,
      action: "UPDATE",
      entityType: ROUTE_PRICE_ENTITY,
      entityId: priceId,
      details: `Updated ${formatRouteSummary(summary)}`,
    });

    res.json({ ok: true, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateBackload(req, res) {
  const pool = getPool("quotes");
  try {
    const priceId = await resolveRoutePriceId(pool, {
    price_id: pickBodyOrParam(req, "price_id", "priceId"),
    pickup_id: pickBodyOrParam(req, "pickup_id", "pickupId"),
    delivery_id: pickBodyOrParam(req, "delivery_id", "deliveryId"),
    vehicle_type_id: pickBodyOrParam(req, "vehicle_type_id", "vehicleTypeId"),
  });
    if (!priceId) {
      return res.status(404).json({ ok: false, error: "Route price not found" });
    }
    const isBackloadRaw = req.body?.is_backload;
    if (isBackloadRaw === undefined) {
      return res.status(400).json({ ok: false, error: "is_backload is required" });
    }
    const is_backload = Number(isBackloadRaw) ? 1 : 0;

    const [result] = await pool.query(
      "UPDATE route_prices SET is_backload=? WHERE price_id=?",
      [is_backload, priceId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: "Route price not found" });
    }

    const summary = await loadRouteSummary(pool, priceId);
    await logOperation({
      req,
      action: "UPDATE",
      entityType: ROUTE_PRICE_ENTITY,
      entityId: priceId,
      details: `Updated backload ${formatRouteSummary(summary)}`,
    });

    res.json({ ok: true, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function deleteRoutePrice(req, res) {
  const pool = getPool("quotes");
  try {
    const priceId = await resolveRoutePriceId(pool, {
      price_id: pickBodyOrParam(req, "price_id", "priceId"),
      pickup_id: pickBodyOrParam(req, "pickup_id", "pickupId"),
      delivery_id: pickBodyOrParam(req, "delivery_id", "deliveryId"),
      vehicle_type_id: pickBodyOrParam(req, "vehicle_type_id", "vehicleTypeId"),
    });
    if (!priceId) {
      return res.status(404).json({ ok: false, error: "Route price not found" });
    }

    const summary = await loadRouteSummary(pool, priceId);
    const [result] = await pool.query("DELETE FROM route_prices WHERE price_id=?", [priceId]);

    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: "Route price not found" });
    }

    await logOperation({
      req,
      action: "DELETE",
      entityType: ROUTE_PRICE_ENTITY,
      entityId: priceId,
      details: `Deleted ${formatRouteSummary(summary)}`,
    });

    res.json({ ok: true, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  listVehicleTypes,
  listRoutePrices,
  createRoutePrice,
  upsertRoutePrice: createRoutePrice,
  updateRoutePrice,
  updateBackload,
  deleteRoutePrice,
};
