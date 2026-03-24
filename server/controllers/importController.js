import { pool } from "../config/db.js";

export async function getAllImports(req, res) {
  try {
    let sql = "SELECT * FROM phieu_nhap_kho WHERE 1=1";
    const params = [];
    if (req.query.fromDate) { sql += " AND ngay_nhap >= ?"; params.push(req.query.fromDate); }
    if (req.query.toDate) { sql += " AND ngay_nhap <= ?"; params.push(req.query.toDate); }
    if (req.query.maNhaCungCap) { sql += " AND ma_nha_cung_cap = ?"; params.push(req.query.maNhaCungCap); }
    sql += " ORDER BY ngay_nhap DESC";
    const [rows] = await pool.query(sql, params);

    const result = [];
    for (const row of rows) {
      const [details] = await pool.query("SELECT * FROM chi_tiet_nhap_kho WHERE ma_phieu_nhap = ?", [row.ma_phieu]);
      // Flatten: one result per detail line for frontend compatibility
      for (const d of details) {
        result.push({
          maPhieu: row.ma_phieu,
          maNhaCungCap: row.ma_nha_cung_cap,
          maNhanVienKho: row.ma_nguoi_nhap,
          ngayNhap: row.ngay_nhap,
          ghiChu: row.ghi_chu || "",
          maThietBi: d.ma_thiet_bi,
          soLuongNhap: d.so_luong,
        });
      }
      // If no details, still show the receipt
      if (details.length === 0) {
        result.push({
          maPhieu: row.ma_phieu,
          maNhaCungCap: row.ma_nha_cung_cap,
          maNhanVienKho: row.ma_nguoi_nhap,
          ngayNhap: row.ngay_nhap,
          ghiChu: row.ghi_chu || "",
          maThietBi: "",
          soLuongNhap: 0,
        });
      }
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createImport(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { maNhaCungCap, maNhanVienKho, maThietBi, soLuongNhap, ngayNhap, ghiChu } = req.body;
    const id = "NK-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Date.now()).slice(-4);

    await conn.query(
      "INSERT INTO phieu_nhap_kho (ma_phieu, ma_nguoi_nhap, ma_nha_cung_cap, ngay_nhap, ghi_chu) VALUES (?, ?, ?, ?, ?)",
      [id, maNhanVienKho || req.user.userId, maNhaCungCap, ngayNhap || new Date(), ghiChu || ""]
    );

    if (maThietBi && soLuongNhap) {
      await conn.query(
        "INSERT INTO chi_tiet_nhap_kho (ma_phieu_nhap, ma_thiet_bi, so_luong, don_gia) VALUES (?, ?, ?, 0)",
        [id, maThietBi, soLuongNhap]
      );
      await conn.query(
        "UPDATE ton_kho SET so_luong_kho = so_luong_kho + ? WHERE ma_thiet_bi = ?",
        [soLuongNhap, maThietBi]
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
