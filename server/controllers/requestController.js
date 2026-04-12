import { pool } from "../config/db.js";

export async function getAllRequests(req, res) {
  try {
    let sql = "SELECT * FROM phieu_yeu_cau WHERE 1=1";
    const params = [];
    if (req.query.maKhoa) { sql += " AND ma_khoa = ?"; params.push(req.query.maKhoa); }
    if (req.query.trangThai) { sql += " AND trang_thai = ?"; params.push(req.query.trangThai); }
    sql += " ORDER BY ngay_tao DESC";
    
    const [rows] = await pool.query(sql, params);
    
    if (rows.length === 0) return res.json([]);

    // Fetch details
    const phieuIds = rows.map(r => r.ma_phieu);
    const [details] = await pool.query("SELECT * FROM chi_tiet_yeu_cau WHERE ma_phieu_yeu_cau IN (?)", [phieuIds]);
    
    const result = rows.map(row => {
      const chiTiet = details.filter(d => d.ma_phieu_yeu_cau === row.ma_phieu).map(d => ({
        id: d.id,
        maPhieuYeuCau: d.ma_phieu_yeu_cau,
        maThietBi: d.ma_thiet_bi,
        soLuongYeuCau: d.so_luong_yeu_cau,
        hanMuon: d.han_muon
      }));

      return {
        maPhieu: row.ma_phieu,
        maNguoiYeuCau: row.ma_nguoi_yeu_cau,
        maKhoa: row.ma_khoa,
        lyDo: row.ly_do || "",
        trangThai: row.trang_thai,
        ngayTao: row.ngay_tao,
        ngayDuyet: row.ngay_duyet,
        nguoiDuyet: row.nguoi_duyet,
        lyDoTuChoi: row.ly_do_tu_choi || "",
        chiTiet
      };
    });

    res.json(result);
  } catch (err) {
    console.error("getAllRequests Error:", err);
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createRequest(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { maNguoiYeuCau, maKhoa, lyDo, chiTiet } = req.body;
    
    if (!chiTiet || chiTiet.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Danh sách thiết bị trống." });
    }

    const id = "YCCF-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Date.now()).slice(-4);

    await conn.query(
      "INSERT INTO phieu_yeu_cau (ma_phieu, ma_nguoi_yeu_cau, ma_khoa, ly_do, trang_thai) VALUES (?, ?, ?, ?, 'CHO_DUYET')",
      [id, maNguoiYeuCau || req.user.userId, maKhoa, lyDo || ""]
    );

    // Insert chi tiet
    for (const item of chiTiet) {
      await conn.query(
        "INSERT INTO chi_tiet_yeu_cau (ma_phieu_yeu_cau, ma_thiet_bi, so_luong_yeu_cau, han_muon) VALUES (?, ?, ?, ?)",
        [id, item.maThietBi, item.soLuongYeuCau, item.hanMuon || null]
      );
    }

    // Notify all Managers and Admins
    const [managers] = await conn.query("SELECT ma_nguoi_dung FROM nguoi_dung WHERE vai_tro IN ('ADMIN', 'TRUONG_KHOA')");
    for (const m of managers) {
      const notifId = "TB-" + String(Date.now()).slice(-8) + "-" + Math.random().toString(36).slice(-4);
      await conn.query(
        "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, 'info', ?)",
        [notifId, "Yêu cầu cấp phát mới", `Nhân viên ${maNguoiYeuCau || req.user.userId} vừa tạo yêu cầu cấp phát mới mã ${id}`, m.ma_nguoi_dung]
      );
    }

    await conn.commit();
    res.json({ success: true, message: "Đã gửi yêu cầu cấp phát" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  } finally {
    conn.release();
  }
}

export async function approveDept(req, res) {
  try {
    const { approved, lyDo } = req.body;
    if (approved) {
      await pool.query(
        "UPDATE phieu_yeu_cau SET trang_thai = 'DA_DUYET', ngay_duyet = NOW(), nguoi_duyet = ? WHERE ma_phieu = ?",
        [req.user.userId, req.params.id]
      );
    } else {
      await pool.query(
        "UPDATE phieu_yeu_cau SET trang_thai = 'TU_CHOI', ly_do_tu_choi = ?, nguoi_duyet = ? WHERE ma_phieu = ?",
        [lyDo || "", req.user.userId, req.params.id]
      );
    }

    // Notify requester
    const [reqData] = await pool.query("SELECT ma_nguoi_yeu_cau FROM phieu_yeu_cau WHERE ma_phieu = ?", [req.params.id]);
    if (reqData.length > 0) {
      const notifId = "TB-" + String(Date.now()).slice(-8) + "-" + Math.random().toString(36).slice(-4);
      const msg = approved ? `Yêu cầu cấp phát ${req.params.id} của bạn đã được Trưởng khoa phê duyệt.` : `Yêu cầu cấp phát ${req.params.id} của bạn đã bị từ chối. Lý do: ${lyDo || 'Không có'}`;
      await pool.query(
        "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, ?, ?)",
        [notifId, approved ? "Yêu cầu được chấp nhận" : "Yêu cầu bị từ chối", msg, approved ? "success" : "error", reqData[0].ma_nguoi_yeu_cau]
      );
    }

    res.json({ success: true, newStatus: approved ? "DA_DUYET" : "TU_CHOI", message: approved ? "Đã duyệt." : "Đã từ chối." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function approveManager(req, res) {
  approveDept(req, res);
}

export async function processRequest(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const maPhieuYeuCau = req.params.id;
    const { maNhanVienKho, ghiChu } = req.body;

    const [reqRows] = await conn.query("SELECT * FROM phieu_yeu_cau WHERE ma_phieu = ?", [maPhieuYeuCau]);
    if (reqRows.length === 0) {
      await conn.rollback();
      return res.json({ success: false, message: "Không tìm thấy phiếu yêu cầu." });
    }
    const request = reqRows[0];
    
    const [chiTiet] = await conn.query("SELECT * FROM chi_tiet_yeu_cau WHERE ma_phieu_yeu_cau = ?", [maPhieuYeuCau]);

    // Check inventory for all items
    for (const item of chiTiet) {
      const [inv] = await conn.query("SELECT so_luong_kho FROM ton_kho WHERE ma_thiet_bi = ?", [item.ma_thiet_bi]);
      if (inv.length === 0 || inv[0].so_luong_kho < item.so_luong_yeu_cau) {
        await conn.rollback();
        return res.json({ success: false, message: `Không đủ tồn kho cho thiết bị ${item.ma_thiet_bi}.` });
      }
    }

    // Create allocation
    const cpId = "CP-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Date.now()).slice(-4);
    await conn.query(
      "INSERT INTO phieu_cap_phat (ma_phieu, ma_phieu_yeu_cau, ma_nguoi_cap, ma_khoa_nhan, ghi_chu) VALUES (?, ?, ?, ?, ?)",
      [cpId, maPhieuYeuCau, maNhanVienKho || req.user.userId, request.ma_khoa, ghiChu || ""]
    );

    // Process each item
    for (const item of chiTiet) {
      await conn.query(
        "INSERT INTO chi_tiet_cap_phat (ma_phieu_cap_phat, ma_thiet_bi, so_luong) VALUES (?, ?, ?)",
        [cpId, item.ma_thiet_bi, item.so_luong_yeu_cau]
      );
      // Update inventory
      await conn.query(
        "UPDATE ton_kho SET so_luong_kho = so_luong_kho - ?, so_luong_dang_dung = so_luong_dang_dung + ? WHERE ma_thiet_bi = ?",
        [item.so_luong_yeu_cau, item.so_luong_yeu_cau, item.ma_thiet_bi]
      );
    }

    // Update request status
    await conn.query("UPDATE phieu_yeu_cau SET trang_thai = 'DA_CAP_PHAT' WHERE ma_phieu = ?", [maPhieuYeuCau]);

    // Notify requester about allocation with QR simulation
    const notifId = "TB-" + String(Date.now()).slice(-8) + "-" + Math.random().toString(36).slice(-4);
    await conn.query(
      "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, 'success', ?)",
      [notifId, "Thiết bị đã sẵn sàng", `Thiết bị trong phiếu ${maPhieuYeuCau} đã cấp phát ([QR:${maPhieuYeuCau}])`, request.ma_nguoi_yeu_cau]
    );

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

export async function deleteRequest(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    
    const [allocations] = await conn.query("SELECT * FROM phieu_cap_phat WHERE ma_phieu_yeu_cau = ?", [id]);
    if (allocations.length > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Không thể xóa phiếu yêu cầu đã được cấp phát." });
    }

    await conn.query("DELETE FROM chi_tiet_yeu_cau WHERE ma_phieu_yeu_cau = ?", [id]);
    await conn.query("DELETE FROM phieu_yeu_cau WHERE ma_phieu = ?", [id]);
    await conn.commit();
    res.json({ success: true, message: "Đã xóa phiếu yêu cầu." });
  } catch (err) {
    await conn.rollback();
    console.error("Delete Request Error:", err);
    res.status(500).json({ success: false, message: `Lỗi máy chủ: ${err.message}` });
  } finally {
    conn.release();
  }
}
