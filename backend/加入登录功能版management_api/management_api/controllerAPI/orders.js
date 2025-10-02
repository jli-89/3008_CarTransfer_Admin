// controllerAPI/orders.js
const { getPool } = require("../database");

// GET /api/orders - return orders with nested items (simple join + group in JS)
async function listOrders(req, res){
  try{
    const conn = await getPool("orders").getConnection();
    try{
      const [rows] = await conn.query(`
        SELECT o.order_id, o.public_order_code, o.customer_name, o.customer_email,
               o.customer_phone, o.price_total, o.order_status, o.created_at,
               i.item_id, i.pickup_location, i.delivery_location,
               i.transfer_status, i.transfer_note
        FROM orders o
        LEFT JOIN order_items i ON i.order_id = o.order_id
        ORDER BY o.order_id DESC, i.item_id ASC
      `);
      // group rows by order
      const map = new Map();
      for(const r of rows){
        if(!map.has(r.order_id)){
          map.set(r.order_id, {
            order_id: r.order_id,
            public_order_code: r.public_order_code,
            customer_name: r.customer_name,
            customer_email: r.customer_email,
            customer_phone: r.customer_phone,
            price_total: r.price_total,
            order_status: r.order_status,
            created_at: r.created_at,
            items: []
          });
        }
        if(r.item_id){
          map.get(r.order_id).items.push({
            item_id: r.item_id,
            pickup_location: r.pickup_location,
            delivery_location: r.delivery_location,
            transfer_status: r.transfer_status,
            transfer_note: r.transfer_note
          });
        }
      }
      res.json({ ok: true, data: Array.from(map.values()) });
    }finally{
      conn.release();
    }
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

// GET /api/meta/transfer-status-options - parse enum values from schema
async function getTransferStatusOptions(req, res){
  try{
    const conn = await getPool("orders").getConnection();
    try{
      const [rows] = await conn.query("SHOW COLUMNS FROM order_items LIKE 'transfer_status'");
      // rows[0].Type = "enum('AwaitingPickup','PickedUp',...)"
      const type = rows[0]?.Type || "";
      const m = type.match(/enum\((.*)\)/i);
      let options = [];
      if(m){
        options = m[1].split(/,(?=(?:[^']*'[^']*')*[^']*$)/).map(s=>s.trim().replace(/^'/,'').replace(/'$/,''));
      }
      res.json({ ok:true, data: options });
    }finally{
      conn.release();
    }
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

// PUT /api/items/:itemId/transfer_status  { transfer_status, note }
async function updateItemStatus(req, res){
  const itemId = Number(req.params.itemId);
  const { transfer_status, note } = req.body || {};
  if(!itemId || !transfer_status){
    return res.status(400).json({ ok:false, error: "itemId and transfer_status are required" });
  }
  try{
    const conn = await getPool("orders").getConnection();
    try{
      // update current status
      await conn.query(
        "UPDATE order_items SET transfer_status=?, transfer_note=IFNULL(?, transfer_note) WHERE item_id=?",
        [transfer_status, note ?? null, itemId]
      );
      // optionally record history if table exists
      try{
        await conn.query(
          "INSERT INTO transfer_status_history (item_id, old_status, new_status, note) VALUES (?, NULL, ?, ?)",
          [itemId, transfer_status, note ?? null]
        );
      }catch(e){ /* ignore if table not present */ }
      res.json({ ok:true, item_id: itemId, transfer_status });
    }finally{
      conn.release();
    }
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

module.exports = { listOrders, getTransferStatusOptions, updateItemStatus };
