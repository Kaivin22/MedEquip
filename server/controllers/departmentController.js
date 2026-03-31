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
    const [rows] = await pool.query(
      "SELECT * FROM khoa ORDER BY CAST(SUBSTRING(ma_khoa, 3) AS UNSIGNED) ASC"
    );
    res.json(rows.map(mapDept));
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createDepartment(req, res) {
  try {
    const tenKhoa = (req.body.tenKhoa || '').trim();
    const moTa = (req.body.moTa || '').trim();

    if (!tenKhoa) {
      return res.json({ success: false, message: "Tên khoa không được để trống." });
    }

    const [existingName] = await pool.query(
      "SELECT ma_khoa FROM khoa WHERE LOWER(ten_khoa) = LOWER(?) LIMIT 1",
      [tenKhoa]
    );
    if (existingName.length > 0) {
      return res.json({ success: false, message: "Khoa đã tồn tại." });
    }

    const [existingCode] = await pool.query(
      "SELECT ma_khoa FROM khoa WHERE ma_khoa REGEXP '^K-[0-9]{3}$' ORDER BY CAST(SUBSTRING(ma_khoa, 3) AS UNSIGNED) DESC LIMIT 1"
    );
    let newIdNum = 1;
    if (existingCode.length > 0) {
      const lastId = existingCode[0].ma_khoa;
      const numPart = parseInt(lastId.substring(2), 10);
      if (!isNaN(numPart)) {
        newIdNum = numPart + 1;
      }
    }
    const id = "K-" + String(newIdNum).padStart(3, '0');

    await pool.query(
      "INSERT INTO khoa (ma_khoa, ten_khoa, mo_ta, trang_thai) VALUES (?, ?, ?, TRUE)",
      [id, tenKhoa, moTa]
    );
    const [rows] = await pool.query("SELECT * FROM khoa WHERE ma_khoa = ?", [id]);
    res.json({ success: true, department: mapDept(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function deleteDepartment(req, res) {
  try {
    const id = req.params.id;
    const [existing] = await pool.query("SELECT ma_khoa FROM khoa WHERE ma_khoa = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khoa." });
    }

    try {
      await pool.query("DELETE FROM khoa WHERE ma_khoa = ?", [id]);
      return res.json({ success: true, message: "Đã xóa khoa." });
    } catch (err) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        await pool.query("UPDATE khoa SET trang_thai = FALSE WHERE ma_khoa = ?", [id]);
        return res.json({ success: true, message: "Khoa đang có dữ liệu liên quan nên đã bị vô hiệu hóa." });
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function updateDepartment(req, res) {
  try {
    const tenKhoa = (req.body.tenKhoa || '').trim();
    const moTa = (req.body.moTa || '').trim();
    const id = req.params.id;

    if (!tenKhoa) {
      return res.json({ success: false, message: "Tên khoa không được để trống." });
    }

    const [existing] = await pool.query("SELECT ma_khoa FROM khoa WHERE ma_khoa = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khoa." });
    }

    const [duplicate] = await pool.query(
      "SELECT ma_khoa FROM khoa WHERE LOWER(ten_khoa) = LOWER(?) AND ma_khoa <> ? LIMIT 1",
      [tenKhoa, id]
    );
    if (duplicate.length > 0) {
      return res.json({ success: false, message: "Tên khoa đã tồn tại." });
    }

    await pool.query("UPDATE khoa SET ten_khoa = ?, mo_ta = ? WHERE ma_khoa = ?", [tenKhoa, moTa, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}
