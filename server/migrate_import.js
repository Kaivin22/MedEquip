import { pool } from "./config/db.js";

async function migrateImport() {
  console.log("--- Bắt đầu cập nhật & Kiểm tra Database cho Nhập Kho ---");
  try {
    const conn = await pool.getConnection();

    // Đảm bảo các cột cho việc duyệt phiếu nhập tồn tại
    const columns = [
      "trang_thai ENUM('CHO_DUYET','DA_DUYET','TU_CHOI') NOT NULL DEFAULT 'CHO_DUYET'",
      "nguoi_duyet VARCHAR(50) NULL",
      "ly_do_tu_choi TEXT NULL",
      "ngay_duyet DATETIME NULL"
    ];

    for (const col of columns) {
      const colName = col.split(' ')[0];
      try {
        await conn.query(`ALTER TABLE phieu_nhap_kho ADD COLUMN ${col}`);
        console.log(`✅ Đã thêm cột: ${colName}`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️ Cột đã tồn tại: ${colName}`);
        } else {
          console.error(`❌ Lỗi xử lý cột ${colName}:`, e.message);
        }
      }
    }

    // XÁC MINH CẤU TRÚC
    console.log("\n--- TRẠNG THÁI BẢNG PHIEU_NHAP_KHO ---");
    const [rows] = await conn.query("SHOW COLUMNS FROM phieu_nhap_kho");
    console.table(rows.map(r => ({
      Field: r.Field,
      Type: r.Type,
      Null: r.Null,
      Default: r.Default
    })));

    conn.release();
    console.log("\n✅ Hoàn tất migrate Nhập Kho.");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ LỖI HỆ THỐNG:", err.message);
    process.exit(1);
  }
}

migrateImport();
