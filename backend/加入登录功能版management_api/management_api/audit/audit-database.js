const mysql = require("mysql2/promise");
const cfg = require("./audit-db-details");

const auditPool = mysql.createPool({
  host: cfg.mysqlHost,
  port: cfg.mysqlPort,
  user: cfg.mysqlUser,
  password: cfg.mysqlPassword,
  database: cfg.dbAudit,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

module.exports = {
  auditPool,
  getAuditPool() {
    return auditPool;
  },
};
