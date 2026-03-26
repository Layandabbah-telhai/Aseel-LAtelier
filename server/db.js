const mysql = require("mysql2/promise");

function createPoolFromEnv() {
  console.log("DB ENV:", {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
  });

  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: {
      rejectUnauthorized: false, // 🚨 REQUIRED for Railway
    },
  });
}

module.exports = { createPoolFromEnv };