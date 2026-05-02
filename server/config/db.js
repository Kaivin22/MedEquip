import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "3107",
  database: process.env.DB_NAME || "medequip_db",
  port: parseInt(process.env.DB_PORT || "3307"),
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4"
});
