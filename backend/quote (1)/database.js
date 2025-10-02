// database.js
var mysql = require("mysql2");
var dbDetails = require("./db-details");

module.exports = {
  getconnection: function () {
    return mysql.createConnection({
      host: dbDetails.host,
      user: dbDetails.user,
      password: dbDetails.password,
      database: dbDetails.database
    });
  }
};
