import { pool } from "../config/db.js";

function mapEquipment(row) {
  return {
    maThietBi: row.ma_thiet_bi,
    tenThietBi: row.ten_thiet_bi,
    loaiThietBi: row.loai_thiet_bi,
    donViTinh: row.don_vi_tinh,
    moTa: row.mo_ta,
    maNhaCungCap: row.ma_nha_cung_cap,
    hinhAnh: row.hinh_anh || "",
    trangThai: !!row.trang_thai,
    ngayTao: row.ngay_tao
  };
}

export async function getAllEquipment(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM thiet_bi ORDER BY ngay_tao DESC");
    res.json(rows.map(mapEquipment));
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createEquipment(req, res) {
  try {
    const { tenThietBi, loaiThietBi, donViTinh, moTa, maNhaCungCap, hinhAnh } = req.body;

    const [existing] = await pool.query("SELECT ma_thiet_bi FROM thiet_bi WHERE ten_thiet_bi = ?", [tenThietBi]);
    if (existing.length > 0) return res.json({ success: false, message: "Thiết bị đã tồn tại." });

    const id = "TB-" + String(Date.now()).slice(-6);
    await pool.query(
      "INSERT INTO thiet_bi (ma_thiet_bi, ten_thiet_bi, loai_thiet_bi, don_vi_tinh, mo_ta, ma_nha_cung_cap, hinh_anh, trang_thai) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)",
      [id, tenThietBi, loaiThietBi, donViTinh, moTa || "", maNhaCungCap || null, hinhAnh || ""]
    );

    const tkId = "TK-" + String(Date.now()).slice(-6);
    await pool.query(
      "INSERT INTO ton_kho (ma_ton_kho, ma_thiet_bi, so_luong_kho, so_luong_hu, so_luong_dang_dung) VALUES (?, ?, 0, 0, 0)",
      [tkId, id]
    );

    const [rows] = await pool.query("SELECT * FROM thiet_bi WHERE ma_thiet_bi = ?", [id]);
    res.json({ success: true, equipment: mapEquipment(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function deactivateEquipment(req, res) {
  try {
    const [inv] = await pool.query("SELECT so_luong_kho FROM ton_kho WHERE ma_thiet_bi = ?", [req.params.id]);
    if (inv.length > 0 && inv[0].so_luong_kho > 0) {
      return res.json({ success: false, message: `Không thể ngừng khi còn ${inv[0].so_luong_kho} đơn vị trong kho.` });
    }
    await pool.query("UPDATE thiet_bi SET trang_thai = FALSE WHERE ma_thiet_bi = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}
