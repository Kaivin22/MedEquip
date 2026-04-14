import { pool } from "./config/db.js";

async function run() {
  try {
    console.log("Migrating thiet_bi...");
    await pool.query("ALTER TABLE thiet_bi CHANGE don_vi_tinh don_vi_co_so VARCHAR(20) DEFAULT 'Cái'");
    try {
        await pool.query("ALTER TABLE thiet_bi ADD COLUMN don_vi_nhap VARCHAR(20) DEFAULT 'Hộp' AFTER don_vi_co_so");
    } catch(e) {
        console.log("Column don_vi_nhap may already exist.");
    }
    
    console.log("Migrating chi_tiet_nhap_kho...");
    await pool.query("ALTER TABLE chi_tiet_nhap_kho CHANGE don_vi_tinh don_vi_giao_dich VARCHAR(20) DEFAULT 'Cái'");
    await pool.query("ALTER TABLE chi_tiet_nhap_kho CHANGE so_luong so_luong_giao_dich INT NOT NULL");
    
    try {
        await pool.query("ALTER TABLE chi_tiet_nhap_kho ADD COLUMN so_luong_co_so INT NULL AFTER so_luong_giao_dich");
    } catch(e) {
        console.log("Column so_luong_co_so may already exist.");
    }
    
    console.log("Updating existing so_luong_co_so data...");
    await pool.query(`
      UPDATE chi_tiet_nhap_kho c
      JOIN thiet_bi t ON c.ma_thiet_bi = t.ma_thiet_bi
      SET c.so_luong_co_so = c.so_luong_giao_dich * t.he_so_quy_doi
    `);

    // we should make sure so_luong_co_so is NOT NULL ultimately if needed, but NULL is fine for now
    
    console.log("Migration successful!");
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Schema is already up to date (ER_DUP_FIELDNAME)');
      process.exit(0);
    }
    console.error("Error running migration:", err);
    process.exit(1);
  }
}

run();
