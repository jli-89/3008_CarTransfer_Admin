// db-details.js
// ---- Fill these values to match your cPanel MySQL ----
// module.exports = {
//   mysqlHost: "localhost",
//   mysqlPort: 3306,
//   mysqlUser: "jli89_cartransportadmin",
//   mysqlPassword: "As3webadmin",
//   // Two databases used by the system:
//   dbOrders: "jli89_car_transport2",
//   dbQuotes: "jli89_car_transport_quotes"
// };



//增加環境變量 可以切換到cPanel裏的數據庫 不然本地數據庫
// 這樣就不用每次都改密碼了
// 只需要在根目錄創建一個.env文件 DB_MODE=remote 
// remote 代表連接cPanel的數據庫  不然就是本地數據庫local

// ///本地测试时使用的
// module.exports = {
//   mysqlHost: "localhost",
//   mysqlPort: 3306,
//   mysqlUser: "root",
//   mysqlPassword: "123456",
//   // Two databases used by the system:
//   dbOrders: "car_transport2",
//   dbQuotes: "car_transport_quote"
// };

// db-details.js
require('dotenv').config();

const mode = process.env.DB_MODE || 'local';

const mysqlHost = process.env.MYSQL_HOST || 'localhost';
const mysqlPort = Number(process.env.MYSQL_PORT || 3306);
const mysqlUser = process.env.MYSQL_USER || (mode === 'remote' ? 'jli89_cartransportadmin' : 'root');
const mysqlPassword = process.env.MYSQL_PASSWORD || (mode === 'remote' ? 'As3webadmin' : '123456');

module.exports = {
  mysqlHost,
  mysqlPort,
  mysqlUser,
  mysqlPassword,
  // 业务库：orders / quotes（database.js 会用到这两个字段建连接池）
  dbOrders: process.env.DB_ORDERS || (mode === 'remote' ? 'jli89_car_transport2' : 'car_transport2'),
  dbQuotes: process.env.DB_QUOTES || (mode === 'remote' ? 'jli89_car_transport_quotes' : 'car_transport_quote')
};
