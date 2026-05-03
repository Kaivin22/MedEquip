import { pool } from "./config/db.js";

async function check() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM chi_tiet_cap_phat");
    console.log("COLUMNS IN chi_tiet_cap_phat:", rows.map(r => r.Field));
    
    const [allocs] = await pool.query("SELECT * FROM chi_tiet_cap_phat LIMIT 1");
    console.log("SAMPLE DATA:", allocs[0]);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
