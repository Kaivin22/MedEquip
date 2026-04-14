import { pool } from "./server/config/db.js"; // Lưu ý: Đường dẫn dành cho file ở gốc

function mapReturn(row, details = []) {
  return {
    maPhieuTra: row.ma_phieu_tra,
    maTruongKhoa: row.ma_truong_khoa,
    tenTruongKhoa: row.ten_truong_khoa || "",
    ngayTao: row.ngay_tao,
    trangThai: row.trang_thai,
    ghiChu: row.ghi_chu || "",
    qrData: row.qr_data || "",
    chiTiet: details.map(d => {
      let meta = {};
      try { meta = JSON.parse(d.anh_chung_minh); } catch (e) { }
      return {
        maPhieuCapPhat: meta.maPhieuCapPhat || row.ma_phieu_cap_phat,
        maThietBi: d.ma_thiet_bi,
        tenThietBi: d.ten_thiet_bi || d.ma_thiet_bi,
        soLuong: d.so_luong,
        tinhTrangKhiTra: d.tinh_trang_khi_tra
      };
    })
  };
}

// POST /returns/create — TK tạo phiếu trả
export async function createReturn(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { chiTiet, ghiChu, qrData } = req.body;

    if (!chiTiet || chiTiet.length === 0) {
      await conn.rollback();
      return res.json({ success: false, message: "Vui lòng chọn ít nhất một thiết bị để trả." });
    }

    const userId = req.user.userId;
    const maPhieuTra = "TRA-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-5);

    // Lấy ma_phieu_cap_phat của phần tử đầu tiên (DB yêu cầu NOT NULL trên phieu_tra_thiet_bi)
    const maPhieuCapPhatDauTien = chiTiet[0].maPhieuCapPhat;

    // Tạo phiếu tổng
    const [insertResult] = await conn.query(
      "INSERT INTO phieu_tra_thiet_bi (ma_phieu_tra, ma_phieu_cap_phat, ma_truong_khoa, trang_thai, ghi_chu, qr_data) VALUES (?, ?, ?, 'CHO_XAC_NHAN', ?, ?)",
      [maPhieuTra, maPhieuCapPhatDauTien, userId, ghiChu || "", qrData || maPhieuTra]
    );
    const parentId = insertResult.insertId;

    const processedCapPhats = new Set();
    for (const item of chiTiet) {
      if (!item.maPhieuCapPhat) continue;

      // Kiểm tra trạng thái phiếu cấp phát xem đã được yêu cầu trả chưa
      const [cpRows] = await conn.query(
        "SELECT trang_thai_tra FROM phieu_cap_phat WHERE ma_phieu = ? FOR UPDATE",
        [item.maPhieuCapPhat]
      );

      if (cpRows.length === 0 || cpRows[0].trang_thai_tra === 'YEU_CAU_TRA' || cpRows[0].trang_thai_tra === 'DA_TRA') {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Thiết bị từ phiếu ${item.maPhieuCapPhat} đã được yêu cầu trả hoặc đã trả xong.`
        });
      }

      const meta = { maPhieuCapPhat: item.maPhieuCapPhat };
      await conn.query(
        "INSERT INTO chi_tiet_phieu_tra (ma_phieu_tra, ma_thiet_bi, so_luong, tinh_trang_khi_tra, anh_chung_minh) VALUES (?, ?, ?, ?, ?)",
        [parentId, item.maThietBi, item.soLuong, item.tinhTrangKhiTra || "DA_BOC_SEAL", JSON.stringify(meta)]
      );

      await conn.query("UPDATE phieu_cap_phat SET trang_thai_tra = 'YEU_CAU_TRA' WHERE ma_phieu = ?", [item.maPhieuCapPhat]);
      processedCapPhats.add(item.maPhieuCapPhat);
    }

    // Thông báo cho nhân viên kho
    const [khoStaff] = await conn.query("SELECT ma_nguoi_dung FROM nguoi_dung WHERE vai_tro = 'NV_KHO' AND trang_thai = TRUE");
    for (const kho of khoStaff) {
      const notifId = "TB-" + String(Date.now()).slice(-8) + "-" + Math.random().toString(36).slice(-4);
      await conn.query(
        "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, 'info', ?)",
        [notifId, `Yêu cầu trả thiết bị mới: ${maPhieuTra}`, `Trưởng khoa vừa tạo phiếu trả mới.`, kho.ma_nguoi_dung]
      );
    }

    await conn.commit();
    res.json({ success: true, maPhieuTra, message: "Đã tạo phiếu trả thành công." });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + err.message });
  } finally {
    conn.release();
  }
}

// GET /returns — NV_KHO xem tất cả phiếu trả
export async function getAllReturns(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT ptt.*, nd.ho_ten as ten_truong_khoa
      FROM phieu_tra_thiet_bi ptt
      JOIN nguoi_dung nd ON ptt.ma_truong_khoa = nd.ma_nguoi_dung
      WHERE ptt.ghi_chu IS NULL OR ptt.ghi_chu NOT LIKE '%[DELETED_BY_NVKHO]%'
      ORDER BY ptt.ngay_tao DESC
    `);

    const result = [];
    for (const row of rows) {
      const [details] = await pool.query(`
        SELECT ct.*, COALESCE(tb.ten_thiet_bi, ct.ma_thiet_bi) as ten_thiet_bi
        FROM chi_tiet_phieu_tra ct
        LEFT JOIN thiet_bi tb ON ct.ma_thiet_bi = tb.ma_thiet_bi
        WHERE ct.ma_phieu_tra = ?
      `, [row.id]);
      result.push(mapReturn(row, details));
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

// GET /returns/my — TK xem phiếu trả của mình
export async function getMyReturns(req, res) {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query(`
      SELECT ptt.*, nd.ho_ten as ten_truong_khoa
      FROM phieu_tra_thiet_bi ptt
      JOIN nguoi_dung nd ON ptt.ma_truong_khoa = nd.ma_nguoi_dung
      WHERE ptt.ma_truong_khoa = ? AND (ptt.ghi_chu IS NULL OR ptt.ghi_chu NOT LIKE '%[DELETED_BY_TK]%')
      ORDER BY ptt.ngay_tao DESC
    `, [userId]);

    const result = [];
    for (const row of rows) {
      const [details] = await pool.query(`
        SELECT ct.*, COALESCE(tb.ten_thiet_bi, ct.ma_thiet_bi) as ten_thiet_bi
        FROM chi_tiet_phieu_tra ct
        LEFT JOIN thiet_bi tb ON ct.ma_thiet_bi = tb.ma_thiet_bi
        WHERE ct.ma_phieu_tra = ?
      `, [row.id]);
      result.push(mapReturn(row, details));
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

// PUT /returns/:id/confirm — NV_KHO chấp nhận/từ chối
export async function confirmReturn(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { approved, lyDo } = req.body;

    const [rows] = await conn.query("SELECT * FROM phieu_tra_thiet_bi WHERE ma_phieu_tra = ?", [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu trả." });
    }
    const phieu = rows[0];

    const newStatus = approved ? "DA_TRA" : "TU_CHOI";
    await conn.query("UPDATE phieu_tra_thiet_bi SET trang_thai = ? WHERE id = ?", [newStatus, phieu.id]);

    // Lấy chi tiết phiếu trả
    const [details] = await conn.query("SELECT * FROM chi_tiet_phieu_tra WHERE ma_phieu_tra = ?", [phieu.id]);

    for (const d of details) {
      let meta = {};
      try { meta = JSON.parse(d.anh_chung_minh); } catch (e) { }
      const curMaPhieuCapPhat = meta.maPhieuCapPhat || phieu.ma_phieu_cap_phat;

      if (approved) {
        const [cpRows] = await conn.query(
          "SELECT trang_thai_tra FROM phieu_cap_phat WHERE ma_phieu = ?", [curMaPhieuCapPhat]
        );

        if (cpRows.length > 0 && cpRows[0].trang_thai_tra !== 'YEU_CAU_TRA') {
          // Nếu đã trả rồi hoặc chưa bao giờ yêu cầu trả thì bỏ quả để tránh sai lệch kho
          continue;
        }

        const [tbRows] = await conn.query("SELECT loai_thiet_bi FROM thiet_bi WHERE ma_thiet_bi = ?", [d.ma_thiet_bi]);
        const loaiTB = tbRows[0]?.loai_thiet_bi || "TAI_SU_DUNG";

        // Cộng lại tồn kho cho các thiết bị được trả
        if (d.tinh_trang_khi_tra !== "HONG") {
          if (loaiTB === 'VAT_TU_TIEU_HAO' && d.tinh_trang_khi_tra === 'DA_BOC_SEAL') {
            await conn.query(
              "UPDATE ton_kho SET so_luong_dang_dung = GREATEST(0, so_luong_dang_dung - ?) WHERE ma_thiet_bi = ?",
              [d.so_luong, d.ma_thiet_bi]
            );
          } else {
            // Tái sử dụng hoặc Vật tư nguyên seal
            await conn.query(
              "UPDATE ton_kho SET so_luong_kho = so_luong_kho + ?, so_luong_dang_dung = GREATEST(0, so_luong_dang_dung - ?) WHERE ma_thiet_bi = ?",
              [d.so_luong, d.so_luong, d.ma_thiet_bi]
            );
          }
        } else {
          // Thiết bị hỏng: trừ dang_dung, cộng hu
          await conn.query(
            "UPDATE ton_kho SET so_luong_hu = so_luong_hu + ?, so_luong_dang_dung = GREATEST(0, so_luong_dang_dung - ?) WHERE ma_thiet_bi = ?",
            [d.so_luong, d.so_luong, d.ma_thiet_bi]
          );
        }

        // Cập nhật phiếu cấp phát thành DA_TRA
        await conn.query("UPDATE phieu_cap_phat SET trang_thai_tra = 'DA_TRA' WHERE ma_phieu = ?", [curMaPhieuCapPhat]);
      } else {
        // Từ chối: khôi phục trạng thái cũ (CHUA_TRA)
        await conn.query("UPDATE phieu_cap_phat SET trang_thai_tra = 'CHUA_TRA' WHERE ma_phieu = ?", [curMaPhieuCapPhat]);
      }
    }

    await conn.commit();
    res.json({ success: true, message: approved ? "Đã xác nhận nhận hàng trả." : "Đã từ chối phiếu trả." });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + err.message });
  } finally {
    conn.release();
  }
}

// Xóa phiếu trả (Xóa mềm)
export async function deleteReturn(req, res) {
  try {
    const { id } = req.params;
    const role = req.user.vaiTro;

    if (role === 'TRUONG_KHOA') {
      await pool.query("UPDATE phieu_tra_thiet_bi SET ghi_chu = CONCAT(IFNULL(ghi_chu, ''), ' [DELETED_BY_TK]') WHERE ma_phieu_tra = ?", [id]);
    } else {
      await pool.query("UPDATE phieu_tra_thiet_bi SET ghi_chu = CONCAT(IFNULL(ghi_chu, ''), ' [DELETED_BY_NVKHO]') WHERE ma_phieu_tra = ?", [id]);
    }
    res.json({ success: true, message: "Đã xóa phiếu trả thành công." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function cancelReturn(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const userId = req.user.userId;

    const [rows] = await conn.query("SELECT * FROM phieu_tra_thiet_bi WHERE ma_phieu_tra = ? AND ma_truong_khoa = ?", [id, userId]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy hoặc không có quyền." });
    }

    const phieu = rows[0];
    if (phieu.trang_thai !== 'CHO_XAC_NHAN') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Chỉ có thể hủy phiếu Đang chờ xác nhận." });
    }

    // Cập nhật trạng thái phiếu trả
    await conn.query("UPDATE phieu_tra_thiet_bi SET trang_thai = 'HUY' WHERE id = ?", [phieu.id]);

    // Trả lại trạng thái cho các phiếu cấp phát
    const [details] = await conn.query("SELECT anh_chung_minh FROM chi_tiet_phieu_tra WHERE ma_phieu_tra = ?", [phieu.id]);
    for (const d of details) {
      let meta = {};
      try { meta = JSON.parse(d.anh_chung_minh); } catch (e) { }
      const curMaPhieuCapPhat = meta.maPhieuCapPhat || phieu.ma_phieu_cap_phat;
      await conn.query("UPDATE phieu_cap_phat SET trang_thai_tra = 'CHUA_TRA' WHERE ma_phieu = ?", [curMaPhieuCapPhat]);
    }

    await conn.commit();
    res.json({ success: true, message: "Đã hủy yêu cầu trả thành công." });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + err.message });
  } finally {
    conn.release();
  }
}
