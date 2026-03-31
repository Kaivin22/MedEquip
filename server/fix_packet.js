import { pool } from "./config/db.js";

async function run() {
  try {
    const [row1] = await pool.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
    console.log("Current max_allowed_packet:", row1[0]);

    await pool.query("SET GLOBAL max_allowed_packet = 104857600"); // 100MB
    console.log("Set GLOBAL max_allowed_packet to 100MB.");

    const [row2] = await pool.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
    console.log("New max_allowed_packet (run anew to see effect):", row2[0]);

    process.exit(0);
  } catch(e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

run();
