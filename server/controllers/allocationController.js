import { pool } from "../config/db.js";

export async function getAllAllocations(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM phieu_cap_phat ORDER BY ngay_cap DESC");
    const result = [];
    for (const row of rows) {
      const [details] = await pool.query("SELECT * FROM chi_tiet_cap_phat WHERE ma_phieu_cap_phat = ?", [row.ma_phieu]);
      // Get the related request to find borrower info
      const [reqRows] = await pool.query("SELECT * FROM phieu_yeu_cau WHERE ma_phieu = ?", [row.ma_phieu_yeu_cau]);
      const request = reqRows[0];

      for (const d of details) {
        result.push({
          maPhieu: row.ma_phieu,
          maPhieuYeuCau: row.ma_phieu_yeu_cau,
          maNhanVienKho: row.ma_nguoi_cap,
          maThietBi: d.ma_thiet_bi,
          maNguoiMuon: request ? request.ma_nguoi_yeu_cau : "",
          maKhoa: row.ma_khoa_nhan,
          soLuongCapPhat: d.so_luong,
          ngayCapPhat: row.ngay_cap,
          ghiChu: row.ghi_chu || ""
        });
      }
      if (details.length === 0) {
        result.push({
          maPhieu: row.ma_phieu,
          maPhieuYeuCau: row.ma_phieu_yeu_cau,
          maNhanVienKho: row.ma_nguoi_cap,
          maThietBi: "",
          maNguoiMuon: request ? request.ma_nguoi_yeu_cau : "",
          maKhoa: row.ma_khoa_nhan,
          soLuongCapPhat: 0,
          ngayCapPhat: row.ngay_cap,
          ghiChu: row.ghi_chu || ""
        });
      }
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createAllocation(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { maPhieuYeuCau, maNhanVienKho, maKhoa, maThietBi, soLuongCapPhat, ghiChu } = req.body;
    const id = "CP-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Date.now()).slice(-4);

    await conn.query(
      "INSERT INTO phieu_cap_phat (ma_phieu, ma_phieu_yeu_cau, ma_nguoi_cap, ma_khoa_nhan, ghi_chu) VALUES (?, ?, ?, ?, ?)",
      [id, maPhieuYeuCau, maNhanVienKho || req.user.userId, maKhoa, ghiChu || ""]
    );

    if (maThietBi && soLuongCapPhat) {
      await conn.query(
        "INSERT INTO chi_tiet_cap_phat (ma_phieu_cap_phat, ma_thiet_bi, so_luong) VALUES (?, ?, ?)",
        [id, maThietBi, soLuongCapPhat]
      );
      await conn.query(
        "UPDATE ton_kho SET so_luong_kho = so_luong_kho - ?, so_luong_dang_dung = so_luong_dang_dung + ? WHERE ma_thiet_bi = ?",
        [soLuongCapPhat, soLuongCapPhat, maThietBi]
      );
    }

    if (maPhieuYeuCau) {
      await conn.query("UPDATE phieu_yeu_cau SET trang_thai = 'DA_CAP_PHAT' WHERE ma_phieu = ?", [maPhieuYeuCau]);
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
