import { pool } from "../config/db.js";

function mapInventory(row) {
  return {
    maTonKho: row.ma_ton_kho,
    maThietBi: row.ma_thiet_bi,
    soLuongKho: row.so_luong_kho,
    soLuongHu: row.so_luong_hu,
    soLuongDangDung: row.so_luong_dang_dung,
    ngayCapNhat: row.ngay_cap_nhat
  };
}

export async function getAllInventory(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM ton_kho");
    res.json(rows.map(mapInventory));
  } catch (err) {
    res.status(500).json({ message: "Lỗi của máy chủ." });
  }
}
