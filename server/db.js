const mysql = require("mysql2/promise");

function createPoolFromEnv() {
  const {
    DB_HOST = "127.0.0.1",
    DB_PORT = "3306",
    DB_USER = "root",
    DB_PASSWORD = "",
    DB_NAME = "aseel_atelier_db",
  } = process.env;

  return mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

module.exports = { createPoolFromEnv };
