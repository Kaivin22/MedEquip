import { pool } from "../config/db.js";

function mapRequest(row) {
  return {
    maPhieu: row.ma_phieu,
    maNguoiYeuCau: row.ma_nguoi_yeu_cau,
    maThietBi: row.ma_thiet_bi,
    maKhoa: row.ma_khoa,
    soLuongYeuCau: row.so_luong_yeu_cau,
    lyDo: row.ly_do || "",
    trangThai: row.trang_thai,
    ngayTao: row.ngay_tao,
    ngayDuyet: row.ngay_duyet,
    nguoiDuyet: row.nguoi_duyet,
    lyDoTuChoi: row.ly_do_tu_choi || ""
  };
}

export async function getAllRequests(req, res) {
  try {
    let sql = "SELECT * FROM phieu_yeu_cau WHERE 1=1";
    const params = [];
    if (req.query.maKhoa) { sql += " AND ma_khoa = ?"; params.push(req.query.maKhoa); }
    if (req.query.trangThai) { sql += " AND trang_thai = ?"; params.push(req.query.trangThai); }
    sql += " ORDER BY ngay_tao DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(mapRequest));
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createRequest(req, res) {
  try {
    const { maNguoiYeuCau, maThietBi, maKhoa, soLuongYeuCau, lyDo } = req.body;
    const id = "YCCF-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Date.now()).slice(-4);

    await pool.query(
      "INSERT INTO phieu_yeu_cau (ma_phieu, ma_nguoi_yeu_cau, ma_thiet_bi, ma_khoa, so_luong_yeu_cau, ly_do, trang_thai) VALUES (?, ?, ?, ?, ?, ?, 'CHO_DUYET')",
      [id, maNguoiYeuCau || req.user.userId, maThietBi, maKhoa, soLuongYeuCau, lyDo || ""]
    );

    const tbId = "TB-N-" + String(Date.now()).slice(-6);
    await pool.query(
      "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan, da_doc) VALUES (?, ?, ?, 'info', ?, FALSE)",
      [tbId, "Yêu cầu cấp phát mới", "Có yêu cầu cấp phát mới " + id, "ND-003"]
    );

    const [rows] = await pool.query("SELECT * FROM phieu_yeu_cau WHERE ma_phieu = ?", [id]);
    res.json({ success: true, phieu: mapRequest(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi của máy chủ." });
  }
}

export async function approveDept(req, res) {
  try {
    const { approved, lyDo } = req.body;
    const [rows] = await pool.query("SELECT ma_nguoi_yeu_cau FROM phieu_yeu_cau WHERE ma_phieu = ?", [req.params.id]);
    const nguoiYeuCau = rows.length > 0 ? rows[0].ma_nguoi_yeu_cau : null;

    if (approved) {
      await pool.query(
        "UPDATE phieu_yeu_cau SET trang_thai = 'DA_DUYET', ngay_duyet = NOW(), nguoi_duyet = ? WHERE ma_phieu = ?",
        [req.user.userId, req.params.id]
      );
      if (nguoiYeuCau) {
        const tbId = "TB-N-" + String(Date.now()).slice(-6);
        await pool.query("INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan, da_doc) VALUES (?, ?, ?, 'success', ?, FALSE)", [tbId, "Yêu cầu đã duyệt", `Phiếu yêu cầu ${req.params.id} đã được Trưởng khoa duyệt.`, nguoiYeuCau]);
      }
      res.json({ success: true, newStatus: "DA_DUYET", message: "Đã duyệt." });
    } else {
      await pool.query(
        "UPDATE phieu_yeu_cau SET trang_thai = 'TU_CHOI', ly_do_tu_choi = ?, nguoi_duyet = ? WHERE ma_phieu = ?",
        [lyDo || "", req.user.userId, req.params.id]
      );
      if (nguoiYeuCau) {
        const tbId = "TB-N-" + String(Date.now()).slice(-6);
        await pool.query("INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan, da_doc) VALUES (?, ?, ?, 'error', ?, FALSE)", [tbId, "Yêu cầu bị từ chối", `Phiếu yêu cầu ${req.params.id} đã bị từ chối.`, nguoiYeuCau]);
      }
      res.json({ success: true, newStatus: "TU_CHOI", message: "Đã từ chối." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function approveManager(req, res) {
  try {
    const { approved, lyDo } = req.body;
    const [rows] = await pool.query("SELECT ma_nguoi_yeu_cau FROM phieu_yeu_cau WHERE ma_phieu = ?", [req.params.id]);
    const nguoiYeuCau = rows.length > 0 ? rows[0].ma_nguoi_yeu_cau : null;

    if (approved) {
      await pool.query(
        "UPDATE phieu_yeu_cau SET trang_thai = 'DA_DUYET', ngay_duyet = NOW(), nguoi_duyet = ? WHERE ma_phieu = ?",
        [req.user.userId, req.params.id]
      );
      if (nguoiYeuCau) {
        const tbId = "TB-N-" + String(Date.now()).slice(-6);
        await pool.query("INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan, da_doc) VALUES (?, ?, ?, 'success', ?, FALSE)", [tbId, "Yêu cầu đã duyệt", `Phiếu yêu cầu ${req.params.id} đã được Quản lý duyệt.`, nguoiYeuCau]);
      }
      res.json({ success: true, newStatus: "DA_DUYET", message: "Quản lý đã duyệt." });
    } else {
      await pool.query(
        "UPDATE phieu_yeu_cau SET trang_thai = 'TU_CHOI', ly_do_tu_choi = ?, nguoi_duyet = ? WHERE ma_phieu = ?",
        [lyDo || "", req.user.userId, req.params.id]
      );
      if (nguoiYeuCau) {
        const tbId = "TB-N-" + String(Date.now()).slice(-6);
        await pool.query("INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan, da_doc) VALUES (?, ?, ?, 'error', ?, FALSE)", [tbId, "Yêu cầu bị từ chối", `Phiếu yêu cầu ${req.params.id} đã bị Quản lý từ chối.`, nguoiYeuCau]);
      }
      res.json({ success: true, newStatus: "TU_CHOI", message: "Đã từ chối." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function processRequest(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const maPhieuYeuCau = req.params.id;
    const { soLuongCapPhat, maNhanVienKho, ghiChu } = req.body;

    const [reqRows] = await conn.query("SELECT * FROM phieu_yeu_cau WHERE ma_phieu = ?", [maPhieuYeuCau]);
    if (reqRows.length === 0) {
      await conn.rollback();
      return res.json({ success: false, message: "Không tìm thấy phiếu yêu cầu." });
    }
    const request = reqRows[0];

    // Check inventory
    const [inv] = await conn.query("SELECT so_luong_kho FROM ton_kho WHERE ma_thiet_bi = ?", [request.ma_thiet_bi]);
    if (inv.length === 0 || inv[0].so_luong_kho < soLuongCapPhat) {
      await conn.rollback();
      return res.json({ success: false, message: "Không đủ tồn kho. Hiện có: " + (inv[0]?.so_luong_kho || 0) });
    }

    // Create allocation
    const cpId = "CP-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Date.now()).slice(-4);
    await conn.query(
      "INSERT INTO phieu_cap_phat (ma_phieu, ma_phieu_yeu_cau, ma_nguoi_cap, ma_khoa_nhan, ghi_chu) VALUES (?, ?, ?, ?, ?)",
      [cpId, maPhieuYeuCau, maNhanVienKho || req.user.userId, request.ma_khoa, ghiChu || ""]
    );
    await conn.query(
      "INSERT INTO chi_tiet_cap_phat (ma_phieu_cap_phat, ma_thiet_bi, so_luong) VALUES (?, ?, ?)",
      [cpId, request.ma_thiet_bi, soLuongCapPhat]
    );

    // Update inventory
    await conn.query(
      "UPDATE ton_kho SET so_luong_kho = so_luong_kho - ?, so_luong_dang_dung = so_luong_dang_dung + ? WHERE ma_thiet_bi = ?",
      [soLuongCapPhat, soLuongCapPhat, request.ma_thiet_bi]
    );

    // Update request status
    await conn.query("UPDATE phieu_yeu_cau SET trang_thai = 'DA_CAP_PHAT' WHERE ma_phieu = ?", [maPhieuYeuCau]);

    await conn.commit();
    res.json({ success: true, message: "Đã xuất kho thành công." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  } finally {
    conn.release();
  }
}

export async function confirmReceived(req, res) {
  try {
    res.json({ success: true, message: "Đã xác nhận nhận hàng." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}
