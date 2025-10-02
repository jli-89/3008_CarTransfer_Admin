// controllerAPI/api-controller.js
var dbcon = require("../database");
var express = require("express");
var rateLimit = require("express-rate-limit");
var router = express.Router();

var conn = dbcon.getconnection();
conn.connect();

// 仅对 /track 做限流：每个 IP 每分钟最多 1500 次
router.use("/track", rateLimit({
  windowMs: 60_000,
  max: 3,
  message: { error: "Too many requests, please try again in 1 minute." }
}));

/**
 * GET /api/track?order_code=...&item_id=...
 * 双重匹配：orders.public_order_code AND order_items.item_id
 * 返回字段：maker, model, colour, pickup_location, delivery_location, transfer_status
 */
router.get("/track", (req, res) => {
  const { order_code, item_id } = req.query || {};
  const itemId = Number(item_id);

  if (!order_code || !itemId) {
    return res.status(400).json({ message: "order_code and item_id are required" });
  }

  const sql = `
    SELECT
      i.snap_maker         AS maker,
      i.snap_model         AS model,
      i.snap_colour        AS colour,
      i.pickup_location    AS pickup_location,
      i.delivery_location  AS delivery_location,
      i.transfer_status    AS transfer_status
    FROM orders o
    JOIN order_items i ON i.order_id = o.order_id
    WHERE o.public_order_code = ?
      AND i.item_id = ?
    LIMIT 1;
  `;

  conn.query(sql, [order_code, itemId], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (!rows.length) return res.json({ data: [] }); // 不泄露细节
    return res.json({ data: rows[0] });
  });
});

module.exports = router;
