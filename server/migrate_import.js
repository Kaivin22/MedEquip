import { pool } from './config/db.js';

async function migrate() {
  try {
    await pool.query("ALTER TABLE phieu_nhap_kho ADD COLUMN IF NOT EXISTS trang_thai ENUM('CHO_DUYET','DA_DUYET','TU_CHOI') NOT NULL DEFAULT 'CHO_DUYET'");
    await pool.query("ALTER TABLE phieu_nhap_kho ADD COLUMN IF NOT EXISTS nguoi_duyet VARCHAR(20) NULL");
    await pool.query("ALTER TABLE phieu_nhap_kho ADD COLUMN IF NOT EXISTS ly_do_tu_choi TEXT NULL");
    await pool.query("ALTER TABLE phieu_nhap_kho ADD COLUMN IF NOT EXISTS ngay_duyet DATETIME NULL");
    // Cập nhật các phiếu cũ đã nhập kho thực tế sang DA_DUYET
    await pool.query("UPDATE phieu_nhap_kho SET trang_thai='DA_DUYET' WHERE trang_thai='CHO_DUYET'");
    console.log('Done: updated phieu_nhap_kho columns');
    process.exit(0);
  } catch(e) {
    console.error(e.message);
    process.exit(1);
  }
}
migrate();
