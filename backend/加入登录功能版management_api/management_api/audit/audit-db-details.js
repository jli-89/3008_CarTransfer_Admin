// module.exports = {
//   mysqlHost: "localhost",
//   mysqlPort: 3306,
//   mysqlUser: "root",
//   mysqlPassword: "123456",
//   dbAudit: "car_transport_audit"
// };



//增加環境變量 可以切換到cPanel裏的數據庫 不然本地數據庫
// 這樣就不用每次都改密碼了
// 只需要在根目錄創建一個.env文件 DB_MODE=remote 
// remote 代表連接cPanel的數據庫 不然就是本地數據庫local
require('dotenv').config();

const mode = process.env.DB_MODE || "local";

let config;

if (mode === "remote") {
  config = {
    mysqlHost: "localhost",
    mysqlPort: 3306,
    mysqlUser: "jli89_cartransportadmin",
    mysqlPassword: "As3webadmin",
    dbAudit: "jli89_car_transport_audit"
  };
} else {
  config = {
    mysqlHost: "localhost",
    mysqlPort: 3306,
    mysqlUser: "root",
    mysqlPassword: "123456",
    dbAudit: "car_transport_audit"
  };
}

module.exports = config;
