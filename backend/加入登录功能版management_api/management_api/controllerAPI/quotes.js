// // controllerAPI/quotes.js
// const { getPool } = require("../database");

// // Helpers to fetch lookup tables
// async function listLocations(req, res){
//   try{
//     const [rows] = await getPool("quotes").query("SELECT location_id, city_name, state_code, postcode FROM locations ORDER BY city_name");
//     res.json({ ok:true, data: rows });
//   }catch(err){
//     res.status(500).json({ ok:false, error: err.message });
//   }
// }

// async function listVehicleTypes(req, res){
//   try{
//     const [rows] = await getPool("quotes").query("SELECT vehicle_type_id, type_code, description FROM vehicle_types ORDER BY vehicle_type_id");
//     res.json({ ok:true, data: rows });
//   }catch(err){
//     res.status(500).json({ ok:false, error: err.message });
//   }
// }

// // GET /api/quotes/route-prices  (optional filters via query params)
// async function listRoutePrices(req, res){
//   try{
//     const { pickup_id, delivery_id, vehicle_type_id } = req.query;
//     const sql = [];
//     const args = [];
//     if(pickup_id){ sql.push("rp.pickup_id=?"); args.push(pickup_id); }
//     if(delivery_id){ sql.push("rp.delivery_id=?"); args.push(delivery_id); }
//     if(vehicle_type_id){ sql.push("rp.vehicle_type_id=?"); args.push(vehicle_type_id); }

//     const where = sql.length ? "WHERE " + sql.join(" AND ") : "";
//     const [rows] = await getPool("quotes").query(`
//       SELECT rp.price_id, rp.pickup_id, p.city_name AS pickup_city, rp.delivery_id, d.city_name AS delivery_city,
//              rp.vehicle_type_id, vt.type_code, rp.price, rp.transit_days, rp.is_backload, rp.created_at
//       FROM route_prices rp
//       JOIN locations p ON p.location_id = rp.pickup_id
//       JOIN locations d ON d.location_id = rp.delivery_id
//       JOIN vehicle_types vt ON vt.vehicle_type_id = rp.vehicle_type_id
//       ${where}
//       ORDER BY rp.created_at DESC, rp.price_id DESC
//     `, args);
//     res.json({ ok:true, data: rows });
//   }catch(err){
//     res.status(500).json({ ok:false, error: err.message });
//   }
// }

// // POST /api/quotes/route-prices
// async function upsertRoutePrice(req, res){
//   const { pickup_id, delivery_id, vehicle_type_id, price, transit_days=null, is_backload=0 } = req.body || {};
//   if(!pickup_id || !delivery_id || !vehicle_type_id || !price){
//     return res.status(400).json({ ok:false, error: "pickup_id, delivery_id, vehicle_type_id, price are required" });
//   }
//   try{
//     const [result] = await getPool("quotes").query(`
//       INSERT INTO route_prices (pickup_id, delivery_id, vehicle_type_id, price, transit_days, is_backload)
//       VALUES (?, ?, ?, ?, ?, ?)
//       ON DUPLICATE KEY UPDATE price=VALUES(price), transit_days=VALUES(transit_days), is_backload=VALUES(is_backload)
//     `, [pickup_id, delivery_id, vehicle_type_id, price, transit_days, is_backload ? 1 : 0]);
//     res.json({ ok:true, affectedRows: result.affectedRows, insertId: result.insertId });
//   }catch(err){
//     res.status(500).json({ ok:false, error: err.message });
//   }
// }

// module.exports = { listLocations, listVehicleTypes, listRoutePrices, upsertRoutePrice };











// controllerAPI/quotes.js
const { getPool } = require("../database");

/**
 * 获取地点列表
 * Get list of locations
 */
async function listLocations(req, res){
  try{
    const [rows] = await getPool("quotes").query(
      "SELECT location_id, city_name, state_code, postcode FROM locations ORDER BY city_name"
    );
    res.json({ ok:true, data: rows });
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

// POST /api/quotes/locations 添加地址
async function createLocation(req, res) {
  const { city_name, state_code, postcode } = req.body || {};
  if (!city_name || !state_code || !postcode) {
    return res.status(400).json({ ok: false, error: "city_name, state_code, postcode are required" });
  }
  try {
    const [result] = await getPool("quotes").query(
      "INSERT INTO locations (city_name, state_code, postcode) VALUES (?, ?, ?)",
      [city_name, state_code, postcode]
    );
    res.json({ ok: true, location_id: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
//如果想修改已有地址（PUT）
async function updateLocation(req, res) {
  const { location_id, city_name, state_code, postcode } = req.body || {};
  if (!location_id || !city_name || !state_code || !postcode) {
    return res.status(400).json({ ok: false, error: "location_id, city_name, state_code, postcode are required" });
  }
  try {
    const [result] = await getPool("quotes").query(
      "UPDATE locations SET city_name=?, state_code=?, postcode=? WHERE location_id=?",
      [city_name, state_code, postcode, location_id]
    );
    res.json({ ok: true, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}


/**
 * 获取车辆类型列表
 * Get list of vehicle types
 */
async function listVehicleTypes(req, res){
  try{
    const [rows] = await getPool("quotes").query(
      "SELECT vehicle_type_id, type_code, description FROM vehicle_types ORDER BY vehicle_type_id"
    );
    res.json({ ok:true, data: rows });
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

/**
 * 获取路线价格（支持筛选）
 * GET /api/quotes/route-prices
 * Optional query params: pickup_id, delivery_id, vehicle_type_id
 */
async function listRoutePrices(req, res){
  try{
    const { pickup_id, delivery_id, vehicle_type_id } = req.query;
    const sql = [];
    const args = [];

    if(pickup_id){ sql.push("rp.pickup_id=?"); args.push(pickup_id); }
    if(delivery_id){ sql.push("rp.delivery_id=?"); args.push(delivery_id); }
    if(vehicle_type_id){ sql.push("rp.vehicle_type_id=?"); args.push(vehicle_type_id); }

    const where = sql.length ? "WHERE " + sql.join(" AND ") : "";

    const [rows] = await getPool("quotes").query(`
      SELECT rp.price_id, rp.pickup_id, p.city_name AS pickup_city, rp.delivery_id, d.city_name AS delivery_city,
             rp.vehicle_type_id, vt.type_code, rp.price, rp.transit_days, rp.is_backload, rp.created_at
      FROM route_prices rp
      JOIN locations p ON p.location_id = rp.pickup_id
      JOIN locations d ON d.location_id = rp.delivery_id
      JOIN vehicle_types vt ON vt.vehicle_type_id = rp.vehicle_type_id
      ${where}
      ORDER BY rp.created_at DESC, rp.price_id DESC
    `, args);

    res.json({ ok:true, data: rows });
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

/**
 * 新增或更新路线价格（UPSERT）
 * POST /api/quotes/route-prices
 */
async function upsertRoutePrice(req, res){
  const { pickup_id, delivery_id, vehicle_type_id, price, transit_days=null, is_backload=0 } = req.body || {};
  if(!pickup_id || !delivery_id || !vehicle_type_id || !price){
    return res.status(400).json({ ok:false, error: "pickup_id, delivery_id, vehicle_type_id, price are required" });
  }
  try{
    const [result] = await getPool("quotes").query(`
      INSERT INTO route_prices (pickup_id, delivery_id, vehicle_type_id, price, transit_days, is_backload)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE price=VALUES(price), transit_days=VALUES(transit_days), is_backload=VALUES(is_backload)
    `, [pickup_id, delivery_id, vehicle_type_id, price, transit_days, is_backload ? 1 : 0]);

    res.json({ ok:true, affectedRows: result.affectedRows, insertId: result.insertId });
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

/* -------------------------------------------------------------------
   NEW CODE: 更新路线价格 / Update route price
   ------------------------------------------------------------------- */
async function updateRoutePrice(req, res){
  const { pickup_id, delivery_id, vehicle_type_id, price, transit_days } = req.body;
  if(!pickup_id || !delivery_id || !vehicle_type_id || !price){
    return res.status(400).json({ ok:false, error: "pickup_id, delivery_id, vehicle_type_id and price are required" });
  }
  try{
    const [result] = await getPool("quotes").query(`
      UPDATE route_prices
      SET price = ?, transit_days = ?
      WHERE pickup_id = ? AND delivery_id = ? AND vehicle_type_id = ?
    `, [price, transit_days, pickup_id, delivery_id, vehicle_type_id]);

    res.json({ ok:true, affectedRows: result.affectedRows });
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

/* -------------------------------------------------------------------
   NEW CODE: 更新 backload 标记 / Update backload flag
   ------------------------------------------------------------------- */
async function updateBackload(req, res){
  const { pickup_id, delivery_id, vehicle_type_id, is_backload } = req.body;
  if(!pickup_id || !delivery_id || !vehicle_type_id || is_backload === undefined){
    return res.status(400).json({ ok:false, error: "pickup_id, delivery_id, vehicle_type_id and is_backload are required" });
  }
  try{
    const [result] = await getPool("quotes").query(`
      UPDATE route_prices
      SET is_backload = ?
      WHERE pickup_id = ? AND delivery_id = ? AND vehicle_type_id = ?
    `, [is_backload ? 1 : 0, pickup_id, delivery_id, vehicle_type_id]);

    res.json({ ok:true, affectedRows: result.affectedRows });
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

// 导出模块 / Export
module.exports = { 
  listLocations, 
  listVehicleTypes, 
  listRoutePrices, 
  upsertRoutePrice,
  updateRoutePrice,   // NEW CODE
  updateBackload,      // NEW CODE
  createLocation, //添加地址
  updateLocation  //更新地址
};
