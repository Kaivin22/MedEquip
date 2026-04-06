import { pool } from "../config/db.js";

export async function getAllAllocations(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM phieu_cap_phat ORDER BY ngay_cap DESC");
    const result = [];
    for (const row of rows) {
      // JOIN với thiet_bi (kể cả thiết bị đã bị xóa mềm) để lấy ten_thiet_bi
      const [details] = await pool.query(
        "SELECT c.*, COALESCE(t.ten_thiet_bi, c.ma_thiet_bi) as ten_thiet_bi FROM chi_tiet_cap_phat c LEFT JOIN thiet_bi t ON c.ma_thiet_bi = t.ma_thiet_bi WHERE c.ma_phieu_cap_phat = ?",
        [row.ma_phieu]
      );
      const [reqRows] = await pool.query("SELECT * FROM phieu_yeu_cau WHERE ma_phieu = ?", [row.ma_phieu_yeu_cau]);
      const request = reqRows[0];

      for (const d of details) {
        result.push({
          maPhieu: row.ma_phieu,
          maPhieuYeuCau: row.ma_phieu_yeu_cau,
          maNhanVienKho: row.ma_nguoi_cap,
          maThietBi: d.ma_thiet_bi,
          tenThietBi: d.ten_thiet_bi || d.ma_thiet_bi,
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
          tenThietBi: "",
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
      
      // Notify requester
      const [reqData] = await conn.query("SELECT ma_nguoi_yeu_cau FROM phieu_yeu_cau WHERE ma_phieu = ?", [maPhieuYeuCau]);
      if (reqData.length > 0) {
        const notifId = "TB-" + String(Date.now()).slice(-8) + "-" + Math.random().toString(36).slice(-4);
        await conn.query(
          "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, 'success', ?)",
          [notifId, "Thiết bị đã sẵn sàng", "Thiết bị đã được cấp phát theo yêu cầu của bạn", reqData[0].ma_nguoi_yeu_cau]
        );
      }
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
