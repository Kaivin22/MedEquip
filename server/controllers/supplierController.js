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
    const [rows] = await pool.query("SELECT * FROM nha_cung_cap WHERE trang_thai = TRUE ORDER BY ngay_tao DESC");
    res.json(rows.map(mapSupplier));
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createSupplier(req, res) {
  try {
    const { tenNhaCungCap, diaChi, soDienThoai, email } = req.body;
    
    if (!tenNhaCungCap) return res.json({ success: false, message: "Tên nhà cung cấp là bắt buộc." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ success: false, message: "Email không hợp lệ." });
    if (soDienThoai && !/^\d+$/.test(soDienThoai)) return res.json({ success: false, message: "Số điện thoại không hợp lệ (chỉ được chứa số, không chứa ký tự đặc biệt)." });

    const [dupName] = await pool.query("SELECT ma_nha_cung_cap FROM nha_cung_cap WHERE ten_nha_cung_cap = ?", [tenNhaCungCap]);
    if (dupName.length > 0) return res.json({ success: false, message: "Tên nhà cung cấp đã tồn tại." });

    if (soDienThoai) {
      const [dupPhone] = await pool.query("SELECT ma_nha_cung_cap FROM nha_cung_cap WHERE so_dien_thoai = ?", [soDienThoai]);
      if (dupPhone.length > 0) return res.json({ success: false, message: "Số điện thoại đã tồn tại." });
    }

    if (email) {
      const [dupEmail] = await pool.query("SELECT ma_nha_cung_cap FROM nha_cung_cap WHERE email = ?", [email]);
      if (dupEmail.length > 0) return res.json({ success: false, message: "Email đã tồn tại." });
    }

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
    const id = req.params.id;

    if (!tenNhaCungCap) return res.json({ success: false, message: "Tên nhà cung cấp là bắt buộc." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ success: false, message: "Email không hợp lệ." });
    if (soDienThoai && !/^\d+$/.test(soDienThoai)) return res.json({ success: false, message: "Số điện thoại không hợp lệ (chỉ được chứa số, không chứa ký tự đặc biệt)." });

    const [dupName] = await pool.query("SELECT ma_nha_cung_cap FROM nha_cung_cap WHERE ten_nha_cung_cap = ? AND ma_nha_cung_cap != ?", [tenNhaCungCap, id]);
    if (dupName.length > 0) return res.json({ success: false, message: "Tên nhà cung cấp đã tồn tại." });

    if (soDienThoai) {
      const [dupPhone] = await pool.query("SELECT ma_nha_cung_cap FROM nha_cung_cap WHERE so_dien_thoai = ? AND ma_nha_cung_cap != ?", [soDienThoai, id]);
      if (dupPhone.length > 0) return res.json({ success: false, message: "Số điện thoại đã tồn tại." });
    }

    if (email) {
      const [dupEmail] = await pool.query("SELECT ma_nha_cung_cap FROM nha_cung_cap WHERE email = ? AND ma_nha_cung_cap != ?", [email, id]);
      if (dupEmail.length > 0) return res.json({ success: false, message: "Email đã tồn tại." });
    }

    await pool.query(
      "UPDATE nha_cung_cap SET ten_nha_cung_cap = ?, dia_chi = ?, so_dien_thoai = ?, email = ? WHERE ma_nha_cung_cap = ?",
      [tenNhaCungCap, diaChi, soDienThoai, email, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;
    
    // Check for associated active equipment
    const [equipment] = await pool.query("SELECT ma_thiet_bi FROM thiet_bi WHERE ma_nha_cung_cap = ? AND trang_thai = TRUE", [id]);
    if (equipment.length > 0) {
      return res.json({ success: false, message: "Không thể xóa nhà cung cấp đang có thiết bị liên kết." });
    }

    try {
      await pool.query("DELETE FROM nha_cung_cap WHERE ma_nha_cung_cap = ?", [id]);
    } catch (dbErr) {
      // Soft delete if hard delete fails due to foreign key constraints
      await pool.query("UPDATE nha_cung_cap SET trang_thai = FALSE WHERE ma_nha_cung_cap = ?", [id]);
    }
    res.json({ success: true, message: "Đã xóa nhà cung cấp." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + String(err.message) });
  }
}
