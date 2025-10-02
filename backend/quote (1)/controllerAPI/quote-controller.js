// controllerAPI/quote-controller.js
var dbcon     = require("../database");
var express   = require("express");
var rateLimit = require("express-rate-limit");
var router    = express.Router();

var conn = dbcon.getconnection();
conn.connect();

// 限流：每 IP 每分钟 20 次
router.use(rateLimit({
  windowMs: 60_000,
  max     : 20,
  message : { error: "Too many requests, please try again in 1 minute." }
}));

/**
 * GET /api/quote?pickup_id=&delivery_id=&vehicle_type_id=
 */
router.get("/quote", (req, res) => {
  const { pickup_id, delivery_id, vehicle_type_id } = req.query || {};
  if (!pickup_id || !delivery_id || !vehicle_type_id) {
    return res.status(400).json({ message: "pickup_id, delivery_id, vehicle_type_id are required" });
  }

  const sql = `
    SELECT price
      FROM route_prices
     WHERE pickup_id=? AND delivery_id=? AND vehicle_type_id=? LIMIT 1
  `;

  conn.query(sql, [pickup_id, delivery_id, vehicle_type_id], (err, rows) => {
    if (err)  return res.status(500).json({ message: "DB error", error: err });
    if (!rows.length)
      return res.json({ message: "Please contact us for a manual quote." });
    res.json({ price: rows[0].price, currency: "AUD" });
  });
});

module.exports = router;
