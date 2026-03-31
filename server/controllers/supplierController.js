import { pool } from "../config/db.js";

function mapSupplier(row) {
  return {
    maNhaCungCap: row.ma_nha_cung_cap,
    tenNhaCungCap: row.ten_nha_cung_cap,
    diaChi: row.dia_chi || "",
    soDienThoai: row.so_dien_thoai || "",
    email: row.email || "",
    trangThai: !!row.trang_thai
  };
}

export async function getAllSuppliers(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM nha_cung_cap ORDER BY ngay_tao DESC");
    res.json(rows.map(mapSupplier));
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createSupplier(req, res) {
  try {
    const { tenNhaCungCap, diaChi, soDienThoai, email } = req.body;
    const id = "NCC-" + String(Date.now()).slice(-6);
    await pool.query(
      "INSERT INTO nha_cung_cap (ma_nha_cung_cap, ten_nha_cung_cap, dia_chi, so_dien_thoai, email, trang_thai) VALUES (?, ?, ?, ?, ?, TRUE)",
      [id, tenNhaCungCap, diaChi || "", soDienThoai || "", email || ""]
    );
    const [rows] = await pool.query("SELECT * FROM nha_cung_cap WHERE ma_nha_cung_cap = ?", [id]);
    res.json({ success: true, supplier: mapSupplier(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function updateSupplier(req, res) {
  try {
    const { tenNhaCungCap, diaChi, soDienThoai, email } = req.body;
    await pool.query(
      "UPDATE nha_cung_cap SET ten_nha_cung_cap = ?, dia_chi = ?, so_dien_thoai = ?, email = ? WHERE ma_nha_cung_cap = ?",
      [tenNhaCungCap, diaChi, soDienThoai, email, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM nha_cung_cap WHERE ma_nha_cung_cap = ?", [id]);
    res.json({ success: true, message: "Đã xóa nhà cung cấp" });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({ success: false, message: "Không thể xóa nhà cung cấp vì đang có dữ liệu liên kết." });
    } else {
      res.status(500).json({ success: false, message: "Lỗi máy chủ." });
    }
  }
}
