import { pool } from "../config/db.js";

export async function getAllExports(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM phieu_xuat_kho ORDER BY ngay_xuat DESC");
    const result = [];
    for (const row of rows) {
      // JOIN với thiet_bi (kể cả thiết bị đã bị xóa mềm) để lấy ten_thiet_bi
      const [details] = await pool.query(
        "SELECT c.*, COALESCE(t.ten_thiet_bi, c.ma_thiet_bi) as ten_thiet_bi FROM chi_tiet_xuat_kho c LEFT JOIN thiet_bi t ON c.ma_thiet_bi = t.ma_thiet_bi WHERE c.ma_phieu_xuat = ?",
        [row.ma_phieu]
      );
      const firstDetail = details[0];
      result.push({
        maPhieu: row.ma_phieu,
        maNhanVienKho: row.ma_nguoi_xuat,
        maThietBi: firstDetail ? firstDetail.ma_thiet_bi : "",
        tenThietBi: firstDetail ? (firstDetail.ten_thiet_bi || firstDetail.ma_thiet_bi) : "",
        soLuong: firstDetail ? firstDetail.so_luong : 0,
        trangThai: row.trang_thai || "DA_LAP",
        maKhoaNhan: row.ma_khoa_nhan || "",
        ngayXuat: row.ngay_xuat,
        lyDoXuat: row.ly_do || "",
        ghiChu: row.ghi_chu || "",
      });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createExport(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { maNhanVienKho, maThietBi, soLuong, lyDoXuat, ghiChu, maKhoaNhan } = req.body;
    const id = "XK-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Date.now()).slice(-4);

    let validKhoa = null;
    if (maKhoaNhan) {
      const [k] = await conn.query("SELECT ma_khoa FROM khoa WHERE ma_khoa = ?", [maKhoaNhan]);
      if (k.length > 0) validKhoa = maKhoaNhan;
    }

    await conn.query(
      "INSERT INTO phieu_xuat_kho (ma_phieu, ma_nguoi_xuat, ma_khoa_nhan, ngay_xuat, ly_do, ghi_chu, trang_thai) VALUES (?, ?, ?, NOW(), ?, ?, 'DA_LAP')",
      [id, maNhanVienKho || req.user.userId, validKhoa, lyDoXuat || "", ghiChu || ""]
    );

    if (maThietBi && soLuong) {
      const [inv] = await conn.query("SELECT so_luong_kho FROM ton_kho WHERE ma_thiet_bi = ?", [maThietBi]);
      if (inv.length === 0 || inv[0].so_luong_kho < soLuong) {
        await conn.rollback();
        return res.json({ success: false, message: `Không đủ tồn kho. Hiện có: ${inv[0]?.so_luong_kho || 0}` });
      }
      await conn.query(
        "INSERT INTO chi_tiet_xuat_kho (ma_phieu_xuat, ma_thiet_bi, so_luong) VALUES (?, ?, ?)",
        [id, maThietBi, soLuong]
      );
    }

    await conn.commit();
    res.json({ success: true, phieu: { maPhieu: id } });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  } finally {
    conn.release();
  }
}

export async function confirmExport(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const maPhieu = req.params.id;

    const [details] = await conn.query("SELECT * FROM chi_tiet_xuat_kho WHERE ma_phieu_xuat = ?", [maPhieu]);
    for (const d of details) {
      const [inv] = await conn.query("SELECT so_luong_kho FROM ton_kho WHERE ma_thiet_bi = ?", [d.ma_thiet_bi]);
      if (inv.length > 0) {
        const deduct = Math.min(d.so_luong, inv[0].so_luong_kho);
        await conn.query("UPDATE ton_kho SET so_luong_kho = so_luong_kho - ? WHERE ma_thiet_bi = ?", [deduct, d.ma_thiet_bi]);
      }
    }

    await conn.query("UPDATE phieu_xuat_kho SET trang_thai = 'DA_XUAT' WHERE ma_phieu = ?", [maPhieu]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  } finally {
    conn.release();
  }
}
