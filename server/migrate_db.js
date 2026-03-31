import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "Mai12345",
    database: process.env.DB_NAME || "medequip_db",
    port: parseInt(process.env.DB_PORT || "3306"),
  });

  try {
    console.log("Creating phieu_yeu_cau_nhap table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS phieu_yeu_cau_nhap (
          ma_phieu VARCHAR(30) PRIMARY KEY,
          ma_nguoi_yeu_cau VARCHAR(20) NOT NULL,
          ten_thiet_bi VARCHAR(200) NOT NULL,
          loai_thiet_bi VARCHAR(50),
          don_vi_tinh VARCHAR(20),
          so_luong INT NOT NULL,
          muc_dich_su_dung TEXT,
          trang_thai ENUM('CHO_DUYET','DA_DUYET','TU_CHOI','DA_NHAP') DEFAULT 'CHO_DUYET',
          ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
          ngay_duyet DATETIME NULL,
          nguoi_duyet VARCHAR(20) NULL,
          ly_do_tu_choi TEXT NULL,
          FOREIGN KEY (ma_nguoi_yeu_cau) REFERENCES nguoi_dung(ma_nguoi_dung),
          FOREIGN KEY (nguoi_duyet) REFERENCES nguoi_dung(ma_nguoi_dung)
      );
    `);
    console.log("Table created successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
