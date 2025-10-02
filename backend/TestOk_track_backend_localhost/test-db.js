// test-db.js
const mysql = require("mysql2");

// 这里用你 db-details.js 里的配置
const config = {
  host: "127.0.0.1",  // 或 localhost
  port: 3306,
  user: "root",
  password: "123456", // 改成你的 MySQL 密码
  database: "car_transport2"
};

const connection = mysql.createConnection(config);

connection.connect((err) => {
  if (err) {
    console.error("❌ 数据库连接失败：", err.message);
    process.exit(1);
  }
  console.log("✅ 数据库连接成功！");

  // 测试查询
  connection.query("SHOW TABLES;", (err, results) => {
    if (err) {
      console.error("❌ 查询失败：", err.message);
    } else {
      console.log("📋 数据库中的表：");
      console.log(results);
    }
    connection.end();
  });
});
