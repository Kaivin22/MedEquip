import { pool } from "../config/db.js";

function mapDept(row) {
  return {
    maKhoa: row.ma_khoa,
    tenKhoa: row.ten_khoa,
    moTa: row.mo_ta || "",
    trangThai: !!row.trang_thai
  };
}

export async function getAllDepartments(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM khoa ORDER BY ngay_tao DESC");
    res.json(rows.map(mapDept));
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createDepartment(req, res) {
  try {
    const { tenKhoa, moTa } = req.body;
    const id = "K-" + String(Date.now()).slice(-6);
    await pool.query(
      "INSERT INTO khoa (ma_khoa, ten_khoa, mo_ta, trang_thai) VALUES (?, ?, ?, TRUE)",
      [id, tenKhoa, moTa || ""]
    );
    const [rows] = await pool.query("SELECT * FROM khoa WHERE ma_khoa = ?", [id]);
    res.json({ success: true, department: mapDept(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function updateDepartment(req, res) {
  try {
    const { tenKhoa, moTa, trangThai } = req.body;
    await pool.query(
      "UPDATE khoa SET ten_khoa = ?, mo_ta = ?, trang_thai = ? WHERE ma_khoa = ?",
      [tenKhoa, moTa, trangThai === undefined ? true : !!trangThai, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function deleteDepartment(req, res) {
  try {
    await pool.query("DELETE FROM khoa WHERE ma_khoa = ?", [req.params.id]);
    res.json({ success: true, message: "Đã xóa khoa." });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      res.status(400).json({ success: false, message: "Không thể xóa khoa này do đã có dữ liệu liên quan." });
    } else {
      res.status(500).json({ success: false, message: "Lỗi máy chủ." });
    }
  }
}
