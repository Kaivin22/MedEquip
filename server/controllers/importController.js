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
      // JOIN với thiet_bi (kể cả thiết bị đã bị xóa mềm) để lấy ten_thiet_bi
      const [details] = await pool.query(
        "SELECT c.*, COALESCE(t.ten_thiet_bi, c.ma_thiet_bi) as ten_thiet_bi FROM chi_tiet_nhap_kho c LEFT JOIN thiet_bi t ON c.ma_thiet_bi = t.ma_thiet_bi WHERE c.ma_phieu_nhap = ?",
        [row.ma_phieu]
      );
      for (const d of details) {
        result.push({
          maPhieu: row.ma_phieu,
          maNhaCungCap: row.ma_nha_cung_cap,
          maNhanVienKho: row.ma_nguoi_nhap,
          ngayNhap: row.ngay_nhap,
          ghiChu: row.ghi_chu || "",
          maThietBi: d.ma_thiet_bi,
          tenThietBi: d.ten_thiet_bi || d.ma_thiet_bi,
          soLuongNhap: d.so_luong,
          trangThai: row.trang_thai || "DA_DUYET",
          nguoiDuyet: row.nguoi_duyet || "",
          lyDoTuChoi: row.ly_do_tu_choi || "",
          ngayDuyet: row.ngay_duyet || null,
        });
      }
      if (details.length === 0) {
        result.push({
          maPhieu: row.ma_phieu,
          maNhaCungCap: row.ma_nha_cung_cap,
          maNhanVienKho: row.ma_nguoi_nhap,
          ngayNhap: row.ngay_nhap,
          ghiChu: row.ghi_chu || "",
          maThietBi: "",
          tenThietBi: "",
          soLuongNhap: 0,
          trangThai: row.trang_thai || "DA_DUYET",
          nguoiDuyet: row.nguoi_duyet || "",
          lyDoTuChoi: row.ly_do_tu_choi || "",
          ngayDuyet: row.ngay_duyet || null,
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
    const userId = maNhanVienKho || req.user.userId;
    const id = "NK-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Date.now()).slice(-4);

    // Tạo phiếu với trạng thái CHO_DUYET (chờ duyệt, chưa cộng kho)
    await conn.query(
      "INSERT INTO phieu_nhap_kho (ma_phieu, ma_nguoi_nhap, ma_nha_cung_cap, ngay_nhap, ghi_chu, trang_thai) VALUES (?, ?, ?, ?, ?, 'CHO_DUYET')",
      [id, userId, maNhaCungCap, ngayNhap || new Date(), ghiChu || ""]
    );

    let tenThietBi = maThietBi;
    if (maThietBi && soLuongNhap) {
      await conn.query(
        "INSERT INTO chi_tiet_nhap_kho (ma_phieu_nhap, ma_thiet_bi, so_luong, don_gia) VALUES (?, ?, ?, 0)",
        [id, maThietBi, soLuongNhap]
      );
      // Lấy tên thiết bị để ghi vào thông báo
      const [tbRows] = await conn.query("SELECT ten_thiet_bi FROM thiet_bi WHERE ma_thiet_bi = ?", [maThietBi]);
      if (tbRows.length > 0) tenThietBi = tbRows[0].ten_thiet_bi;
    }

    // Gửi thông báo cho TRUONG_KHOA và ADMIN
    const [approvers] = await conn.query("SELECT ma_nguoi_dung FROM nguoi_dung WHERE vai_tro IN ('ADMIN','TRUONG_KHOA') AND trang_thai = TRUE");
    for (const a of approvers) {
      const notifId = "TB-" + String(Date.now()).slice(-8) + "-" + Math.random().toString(36).slice(-4);
      await conn.query(
        "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, 'info', ?)",
        [
          notifId,
          `Yêu cầu nhập kho cần duyệt: ${id}`,
          `Nhân viên kho ${userId} vừa lập phiếu nhập kho ${id} cho thiết bị "${tenThietBi}" (SL: ${soLuongNhap || 0}). Vui lòng xem xét và phê duyệt.`,
          a.ma_nguoi_dung
        ]
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

// Trưởng khoa / Admin duyệt hoặc từ chối phiếu nhập kho
export async function approveImport(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { approved, lyDo } = req.body;
    const userId = req.user.userId;

    const [rows] = await conn.query("SELECT * FROM phieu_nhap_kho WHERE ma_phieu = ?", [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu." });
    }
    const phieu = rows[0];
    if (phieu.trang_thai !== 'CHO_DUYET') {
      await conn.rollback();
      return res.json({ success: false, message: "Phiếu này đã được xử lý rồi." });
    }

    const trangThai = approved ? 'DA_DUYET' : 'TU_CHOI';
    await conn.query(
      "UPDATE phieu_nhap_kho SET trang_thai = ?, nguoi_duyet = ?, ly_do_tu_choi = ?, ngay_duyet = NOW() WHERE ma_phieu = ?",
      [trangThai, userId, lyDo || null, id]
    );

    if (approved) {
      // Cộng số lượng vào tồn kho khi được duyệt
      const [details] = await conn.query("SELECT * FROM chi_tiet_nhap_kho WHERE ma_phieu_nhap = ?", [id]);
      for (const d of details) {
        await conn.query(
          "UPDATE ton_kho SET so_luong_kho = so_luong_kho + ? WHERE ma_thiet_bi = ?",
          [d.so_luong, d.ma_thiet_bi]
        );
      }
    }

    // Gửi thông báo ngược lại cho người lập phiếu
    const [details] = await conn.query(
      "SELECT c.so_luong, COALESCE(t.ten_thiet_bi, c.ma_thiet_bi) as ten_thiet_bi FROM chi_tiet_nhap_kho c LEFT JOIN thiet_bi t ON c.ma_thiet_bi = t.ma_thiet_bi WHERE c.ma_phieu_nhap = ?",
      [id]
    );
    const tenTB = details.length > 0 ? details[0].ten_thiet_bi : id;
    const sl = details.length > 0 ? details[0].so_luong : 0;

    const msg = approved
      ? `Phiếu nhập kho ${id} (thiết bị: "${tenTB}", SL: ${sl}) đã được duyệt bởi ${userId}. Tồn kho đã được cập nhật.`
      : `Phiếu nhập kho ${id} (thiết bị: "${tenTB}", SL: ${sl}) đã bị từ chối bởi ${userId}. Lý do: ${lyDo || 'Không có'}`;

    const notifId = "TB-" + String(Date.now()).slice(-8) + "-" + Math.random().toString(36).slice(-4);
    await conn.query(
      "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, ?, ?)",
      [
        notifId,
        approved ? `Phiếu nhập ${id} được duyệt ✓` : `Phiếu nhập ${id} bị từ chối ✗`,
        msg,
        approved ? 'success' : 'error',
        phieu.ma_nguoi_nhap
      ]
    );

    await conn.commit();
    res.json({ success: true, message: approved ? "Đã duyệt và cập nhật tồn kho." : "Đã từ chối phiếu nhập kho." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  } finally {
    conn.release();
  }
}

export async function deleteImport(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    await conn.query("DELETE FROM chi_tiet_nhap_kho WHERE ma_phieu_nhap = ?", [id]);
    await conn.query("DELETE FROM phieu_nhap_kho WHERE ma_phieu = ?", [id]);
    await conn.commit();
    res.json({ success: true, message: "Đã xóa lịch sử nhập kho." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  } finally {
    conn.release();
  }
}
