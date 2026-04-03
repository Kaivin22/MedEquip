import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { mapUser } from "./authController.js";

export async function getAllUsers(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM nguoi_dung ORDER BY CAST(SUBSTRING(ma_nguoi_dung, 4) AS UNSIGNED) ASC, ngay_tao ASC");
    res.json(rows.map(mapUser));
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function getUserById(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM nguoi_dung WHERE ma_nguoi_dung = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy người dùng." });
    res.json(mapUser(rows[0]));
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createUser(req, res) {
  try {
    const { hoTen, email, matKhau, vaiTro, soDienThoai, diaChi } = req.body;

    const [existing] = await pool.query("SELECT ma_nguoi_dung FROM nguoi_dung WHERE email = ?", [email]);
    if (existing.length > 0) return res.json({ success: false, message: "Email đã được sử dụng." });

    const hash = await bcrypt.hash(matKhau, 10);
    
    // Generate sequential ID
    const [existingCode] = await pool.query(
      "SELECT ma_nguoi_dung FROM nguoi_dung WHERE ma_nguoi_dung REGEXP '^ND-[0-9]{3}$' ORDER BY CAST(SUBSTRING(ma_nguoi_dung, 4) AS UNSIGNED) DESC LIMIT 1"
    );
    let newIdNum = 1;
    if (existingCode.length > 0) {
      const lastId = existingCode[0].ma_nguoi_dung;
      const numPart = parseInt(lastId.substring(3), 10);
      if (!isNaN(numPart)) {
        newIdNum = numPart + 1;
      }
    }
    const id = "ND-" + String(newIdNum).padStart(3, '0');

    await pool.query(
      "INSERT INTO nguoi_dung (ma_nguoi_dung, ho_ten, email, mat_khau, vai_tro, trang_thai, so_dien_thoai, dia_chi) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)",
      [id, hoTen, email, hash, vaiTro, soDienThoai || null, diaChi || null]
    );

    const [rows] = await pool.query("SELECT * FROM nguoi_dung WHERE ma_nguoi_dung = ?", [id]);
    res.json({ success: true, user: mapUser(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function updateUser(req, res) {
  try {
    const updates = req.body;
    const fields = [];
    const values = [];

    if (updates.hoTen) { fields.push("ho_ten = ?"); values.push(updates.hoTen); }
    if (updates.email) {
      const [existing] = await pool.query("SELECT ma_nguoi_dung FROM nguoi_dung WHERE email = ? AND ma_nguoi_dung != ?", [updates.email, req.params.id]);
      if (existing.length > 0) return res.json({ success: false, message: "Email đã được sử dụng." });
      fields.push("email = ?"); values.push(updates.email);
    }
    if (updates.soDienThoai !== undefined) { fields.push("so_dien_thoai = ?"); values.push(updates.soDienThoai); }
    if (updates.diaChi !== undefined) { fields.push("dia_chi = ?"); values.push(updates.diaChi); }
    if (updates.vaiTro) { fields.push("vai_tro = ?"); values.push(updates.vaiTro); }
    if (typeof updates.trangThai === "boolean") { fields.push("trang_thai = ?"); values.push(updates.trangThai); }

    if (fields.length === 0) return res.json({ success: true });

    values.push(req.params.id);
    await pool.query(`UPDATE nguoi_dung SET ${fields.join(", ")} WHERE ma_nguoi_dung = ?`, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function deactivateUser(req, res) {
  try {
    await pool.query("UPDATE nguoi_dung SET trang_thai = FALSE WHERE ma_nguoi_dung = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function activateUser(req, res) {
  try {
    await pool.query("UPDATE nguoi_dung SET trang_thai = TRUE WHERE ma_nguoi_dung = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function changeUserRole(req, res) {
  try {
    await pool.query("UPDATE nguoi_dung SET vai_tro = ? WHERE ma_nguoi_dung = ?", [req.body.vaiTro, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function deleteUser(req, res) {
  try {
    const [result] = await pool.query("DELETE FROM nguoi_dung WHERE ma_nguoi_dung = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    }
    res.json({ success: true, message: "Đã xóa người dùng thành công." });
  } catch (err) {
    console.error(err);
    // 1451 is the MySQL error code for foreign key constraint failure
    if (err.errno === 1451) {
      return res.status(400).json({ success: false, message: "Không thể xóa người dùng này vì có dữ liệu liên quan (phiếu mượn, báo hỏng...)." });
    }
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}
