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

    // Fetch items for each request
    const requestsWithItems = await Promise.all(rows.map(async (row) => {
      const [items] = await pool.query(
        "SELECT ct.*, t.ten_thiet_bi, t.don_vi_tinh FROM chi_tiet_yeu_cau ct JOIN thiet_bi t ON ct.ma_thiet_bi = t.ma_thiet_bi WHERE ct.ma_phieu_yeu_cau = ?",
        [row.ma_phieu]
      );
      return {
        ...mapRequest(row),
        items: items.map(i => ({
          maThietBi: i.ma_thiet_bi,
          tenThietBi: i.ten_thiet_bi,
          soLuong: i.so_luong,
          trangThai: i.trang_thai,
          donViTinh: i.don_vi_tinh,
          lyDoTuChoi: i.ly_do_tu_choi || ""
        }))
      };
    }));

    res.json(requestsWithItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

export async function createRequest(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { maNguoiYeuCau, maKhoa, lyDo, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Danh sách thiết bị không hợp lệ." });
    }

    const id = "YCCF-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(Date.now()).slice(-4);
    const firstItem = items[0];

    // Insert main request (backwards compatibility with ma_thiet_bi and so_luong_yeu_cau)
    await conn.query(
      "INSERT INTO phieu_yeu_cau (ma_phieu, ma_nguoi_yeu_cau, ma_thiet_bi, ma_khoa, so_luong_yeu_cau, ly_do, trang_thai) VALUES (?, ?, ?, ?, ?, ?, 'CHO_DUYET')",
      [id, maNguoiYeuCau || req.user.userId, firstItem.maThietBi, maKhoa, firstItem.soLuong, lyDo || ""]
    );

    // Insert all items
    for (const item of items) {
      await conn.query(
        "INSERT INTO chi_tiet_yeu_cau (ma_phieu_yeu_cau, ma_thiet_bi, so_luong, trang_thai) VALUES (?, ?, ?, 'CHO_DUYET')",
        [id, item.maThietBi, item.soLuong]
      );
    }

    // Notify all Managers and Admins
    const [managers] = await conn.query("SELECT ma_nguoi_dung FROM nguoi_dung WHERE vai_tro IN ('ADMIN', 'TRUONG_KHOA')");
    for (const m of managers) {
      const notifId = "TB-" + String(Date.now()).slice(-8) + "-" + Math.random().toString(36).slice(-4);
      await conn.query(
        "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, 'info', ?)",
        [notifId, "Yêu cầu cấp phát mới", `Nhân viên ${maNguoiYeuCau || req.user.userId} vừa tạo yêu cầu cấp phát mới mã ${id} với ${items.length} hạng mục.`, m.ma_nguoi_dung]
      );
    }

    await conn.commit();
    res.json({ success: true, maPhieu: id });
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
    // Update request state
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
    const [reqData] = await pool.query("SELECT ma_nguoi_yeu_cau, ma_thiet_bi FROM phieu_yeu_cau WHERE ma_phieu = ?", [req.params.id]);
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
  try {
    const { approved, lyDo } = req.body;
    // Update request state
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
      const msg = approved ? `Yêu cầu cấp phát ${req.params.id} của bạn đã được Quản trị viên phê duyệt.` : `Yêu cầu cấp phát ${req.params.id} của bạn đã bị từ chối. Lý do: ${lyDo || 'Không có'}`;
      await pool.query(
        "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, ?, ?)",
        [notifId, approved ? "Yêu cầu được chấp nhận" : "Yêu cầu bị từ chối", msg, approved ? "success" : "error", reqData[0].ma_nguoi_yeu_cau]
      );
    }

    res.json({ success: true, newStatus: approved ? "DA_DUYET" : "TU_CHOI", message: approved ? "Quản lý đã duyệt." : "Đã từ chối." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function scanRequest(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM phieu_yeu_cau WHERE ma_phieu = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Không tìm thấy phiếu." });

    const request = mapRequest(rows[0]);
    const [items] = await pool.query(
      `SELECT ct.*, t.ten_thiet_bi, t.don_vi_tinh, tk.so_luong_kho 
       FROM chi_tiet_yeu_cau ct 
       JOIN thiet_bi t ON ct.ma_thiet_bi = t.ma_thiet_bi 
       LEFT JOIN ton_kho tk ON ct.ma_thiet_bi = tk.ma_thiet_bi
       WHERE ct.ma_phieu_yeu_cau = ?`,
      [id]
    );

    res.json({
      success: true,
      request,
      items: items.map(i => ({
        maThietBi: i.ma_thiet_bi,
        tenThietBi: i.ten_thiet_bi,
        soLuong: i.so_luong,
        trangThai: i.trang_thai,
        donViTinh: i.don_vi_tinh,
        tonKho: i.so_luong_kho || 0,
        lyDoTuChoi: i.ly_do_tu_choi || ""
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

export async function processRequestItems(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { items, ghiChu } = req.body; // items: [{maThietBi, approved, lyDo}]

    const [reqRows] = await conn.query("SELECT * FROM phieu_yeu_cau WHERE ma_phieu = ?", [id]);
    if (reqRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu." });
    }
    const request = reqRows[0];

    let approvedCount = 0;
    const approvedDetails = [];

    for (const item of items) {
      if (item.approved) {
        // Check inventory
        const [inv] = await conn.query("SELECT so_luong_kho FROM ton_kho WHERE ma_thiet_bi = ?", [item.maThietBi]);
        const [reqItem] = await conn.query("SELECT so_luong FROM chi_tiet_yeu_cau WHERE ma_phieu_yeu_cau = ? AND ma_thiet_bi = ?", [id, item.maThietBi]);

        if (reqItem.length === 0) continue;
        const soLuong = reqItem[0].so_luong;

        if (inv.length === 0 || inv[0].so_luong_kho < soLuong) {
          await conn.rollback();
          return res.json({ success: false, message: `Không đủ tồn kho cho thiết bị ${item.maThietBi}. Hiện có: ${inv[0]?.so_luong_kho || 0}` });
        }

        // Update item status
        await conn.query(
          "UPDATE chi_tiet_yeu_cau SET trang_thai = 'DA_DUYET' WHERE ma_phieu_yeu_cau = ? AND ma_thiet_bi = ?",
          [id, item.maThietBi]
        );

        // Update inventory (Integrated logic for Reusable vs Consumable)
        const [tbRows] = await conn.query("SELECT loai_thiet_bi FROM thiet_bi WHERE ma_thiet_bi = ?", [item.maThietBi]);
        const isTieuHao = (tbRows[0]?.loai_thiet_bi === 'VAT_TU_TIEU_HAO');

        if (isTieuHao) {
          await conn.query(
            "UPDATE ton_kho SET so_luong_kho = so_luong_kho - ? WHERE ma_thiet_bi = ?",
            [soLuong, item.maThietBi]
          );
        } else {
          await conn.query(
            "UPDATE ton_kho SET so_luong_kho = so_luong_kho - ?, so_luong_dang_dung = so_luong_dang_dung + ? WHERE ma_thiet_bi = ?",
            [soLuong, soLuong, item.maThietBi]
          );
        }

        approvedCount++;
        approvedDetails.push({ maThietBi: item.maThietBi, soLuong });
      } else {
        // Reject item
        await conn.query(
          "UPDATE chi_tiet_yeu_cau SET trang_thai = 'TU_CHOI', ly_do_tu_choi = ? WHERE ma_phieu_yeu_cau = ? AND ma_thiet_bi = ?",
          [item.lyDo || "", id, item.maThietBi]
        );
      }
    }

    if (approvedCount > 0) {
      // Create allocation record
      const cpId = "CP-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(Date.now()).slice(-4);
      await conn.query(
        "INSERT INTO phieu_cap_phat (ma_phieu, ma_phieu_yeu_cau, ma_nguoi_cap, ma_khoa_nhan, ghi_chu, trang_thai_tra) VALUES (?, ?, ?, ?, ?, 'CHUA_TRA')",
        [cpId, id, req.user.userId, request.ma_khoa, ghiChu || ""]
      );

      for (const det of approvedDetails) {
        await conn.query(
          "INSERT INTO chi_tiet_cap_phat (ma_phieu_cap_phat, ma_thiet_bi, so_luong) VALUES (?, ?, ?)",
          [cpId, det.maThietBi, det.soLuong]
        );
      }

      await conn.query("UPDATE phieu_yeu_cau SET trang_thai = 'DA_CAP_PHAT' WHERE ma_phieu = ?", [id]);
    } else {
      await conn.query("UPDATE phieu_yeu_cau SET trang_thai = 'TU_CHOI' WHERE ma_phieu = ?", [id]);
    }

    // Notify requester
    const notifId = "TB-" + String(Date.now()).slice(-8) + "-" + Math.random().toString(36).slice(-4);
    await conn.query(
      "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan) VALUES (?, ?, ?, ?, ?)",
      [notifId, approvedCount > 0 ? "Thiết bị đã sẵn sàng" : "Yêu cầu bị từ chối",
        approvedCount > 0 ? `Yêu cầu ${id} đã được cấp phát ${approvedCount} thiết bị.` : `Yêu cầu ${id} của bạn đã bị từ chối hoàn toàn.`,
        approvedCount > 0 ? 'success' : 'error',
        request.ma_nguoi_yeu_cau]
    );

    await conn.commit();
    res.json({ success: true, message: approvedCount > 0 ? "Đã xuất kho thành công." : "Đã từ chối tất cả thiết bị." });
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
  try {
    const { id } = req.params;

    // Check if request is referenced in phieu_cap_phat
    const [allocations] = await pool.query("SELECT * FROM phieu_cap_phat WHERE ma_phieu_yeu_cau = ?", [id]);
    if (allocations.length > 0) {
      return res.status(400).json({ success: false, message: "Không thể xóa phiếu yêu cầu đã được cấp phát." });
    }

    await pool.query("DELETE FROM phieu_yeu_cau WHERE ma_phieu = ?", [id]);
    res.json({ success: true, message: "Đã xóa phiếu yêu cầu." });
  } catch (err) {
    console.error("Delete Request Error:", err);
    res.status(500).json({ success: false, message: `Lỗi máy chủ: ${err.message}` });
  }
}
