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

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return res.json({ success: false, message: "Email không hợp lệ. Vui lòng nhập đúng định dạng (ví dụ: abc@domain.com)." });
    } 

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

    // Fetch existing user to check vai_tro and email uniqueness safely
    const [existingRows] = await pool.query("SELECT ma_nguoi_dung, vai_tro, email FROM nguoi_dung WHERE ma_nguoi_dung = ?", [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    const existingUser = existingRows[0];

    if (updates.hoTen) { fields.push("ho_ten = ?"); values.push(updates.hoTen); }
    if (updates.email) {
      const emailTrimmed = updates.email.trim();
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(emailTrimmed)) {
        return res.json({ success: false, message: "Email không hợp lệ. Vui lòng nhập đúng định dạng (ví dụ: abc@domain.com)." });
      }
      const [emailCheck] = await pool.query("SELECT ma_nguoi_dung FROM nguoi_dung WHERE email = ? AND ma_nguoi_dung != ?", [emailTrimmed, req.params.id]);
      if (emailCheck.length > 0) return res.json({ success: false, message: "Email đã được sử dụng." });
      fields.push("email = ?"); values.push(emailTrimmed);
    }
    if (updates.soDienThoai !== undefined) {
      if (updates.soDienThoai && !/^\d+$/.test(updates.soDienThoai)) {
        return res.json({ success: false, message: "Số điện thoại chỉ được nhập số" });
      }
      fields.push("so_dien_thoai = ?"); values.push(updates.soDienThoai); 
    }
    if (updates.diaChi !== undefined) { fields.push("dia_chi = ?"); values.push(updates.diaChi); }
    if (updates.vaiTro) { fields.push("vai_tro = ?"); values.push(updates.vaiTro); }
    if (typeof updates.trangThai === "boolean") { 
      if (updates.trangThai === false && existingUser.vai_tro === 'ADMIN') {
        return res.status(400).json({ success: false, message: "Không thể vô hiệu hóa tài khoản ADMIN." });
      }
      fields.push("trang_thai = ?"); values.push(updates.trangThai); 
    }

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
    const id = req.params.id;
    
    // Ngăn chặn xóa tài khoản đang đăng nhập
    if (req.user && req.user.userId === id) {
      return res.status(400).json({ success: false, message: "Tài khoản này đang có người truy cập nên không thể xóa" });
    }

    const [existing] = await pool.query("SELECT ma_nguoi_dung, vai_tro FROM nguoi_dung WHERE ma_nguoi_dung = ?", [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    }

    if (existing[0].vai_tro === 'ADMIN') {
      return res.status(400).json({ success: false, message: "Tài khoản ADMIN quản lý hệ thống nên không thể xóa hoặc vô hiệu hóa." });
    }

    // Kiểm tra các ràng buộc: Không cho xóa nếu có yêu cầu cấp phát đang chờ
    const [requests] = await pool.query("SELECT trang_thai FROM phieu_yeu_cau WHERE ma_nguoi_yeu_cau = ?", [id]);
    const hasPending = requests.some(r => r.trang_thai === 'CHO_DUYET');
    if (hasPending) {
       return res.status(400).json({ success: false, message: "Tài khoản đang có yêu cầu cấp phát chưa được phản hồi, không thể xóa." });
    }

    // Xóa hẳn tài khoản (Hard delete), giữ lại lịch sử thông báo và phiếu (bypass FK)
    const conn = await pool.getConnection();
    try {
      await conn.query("SET FOREIGN_KEY_CHECKS=0");
      await conn.query("DELETE FROM nguoi_dung WHERE ma_nguoi_dung = ?", [id]);
      await conn.query("SET FOREIGN_KEY_CHECKS=1");
    } finally {
      conn.release();
    }
    
    return res.json({ success: true, message: "Đã xóa tài khoản thành công." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}
