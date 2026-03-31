import mysql from "mysql2/promise";

async function testConnection() {
  try {
    const pool = mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "medequip_db",
      port: 3306,
    });
    
    const [rows] = await pool.query("SELECT 1 AS status");
    console.log("Connection successful:", rows);
    process.exit(0);
  } catch (err) {
    console.error("Connection failed:", err.message);
    if (err.code) console.error("Error code:", err.code);
    process.exit(1);
  }
}

testConnection();
