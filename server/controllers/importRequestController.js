import { pool } from "../config/db.js";

// Lấy danh sách phiếu yêu cầu nhập thiết bị mới
export async function getAllImportRequests(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM phieu_yeu_cau_nhap ORDER BY ngay_tao DESC");
    
    // Đổi tên các trường snake_case sang camelCase cho Frontend
    const result = rows.map(r => ({
      maPhieu: r.ma_phieu,
      maNguoiYeuCau: r.ma_nguoi_yeu_cau,
      tenThietBi: r.ten_thiet_bi,
      loaiThietBi: r.loai_thiet_bi || "",
      donViTinh: r.don_vi_tinh || "Cái",
      soLuong: r.so_luong,
      mucDichSuDung: r.muc_dich_su_dung || "",
      trangThai: r.trang_thai,
      ngayTao: r.ngay_tao,
      ngayDuyet: r.ngay_duyet,
      nguoiDuyet: r.nguoi_duyet,
      lyDoTuChoi: r.ly_do_tu_choi
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

// Tạo phiếu mới (NV_KHO làm)
export async function createImportRequest(req, res) {
  try {
    const { tenThietBi, loaiThietBi, donViTinh, soLuong, mucDichSuDung } = req.body;
    const userId = req.user.userId;
    const maPhieu = "YCN-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(Date.now()).slice(-4);
    
    await pool.query(
      "INSERT INTO phieu_yeu_cau_nhap (ma_phieu, ma_nguoi_yeu_cau, ten_thiet_bi, loai_thiet_bi, don_vi_tinh, so_luong, muc_dich_su_dung, trang_thai) VALUES (?, ?, ?, ?, ?, ?, ?, 'CHO_DUYET')",
      [maPhieu, userId, tenThietBi, loaiThietBi || "", donViTinh || "Cái", soLuong || 1, mucDichSuDung || ""]
    );
    
    // Gửi thông báo cho Admin và Trưởng khoa
    const [managers] = await pool.query("SELECT ma_nguoi_dung FROM nguoi_dung WHERE vai_tro IN ('ADMIN', 'TRUONG_KHOA')");
    for (const m of managers) {
      const tbId = "TB-N-" + String(Date.now()).slice(-5) + Math.floor(Math.random() * 1000);
      await pool.query(
        "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan, da_doc) VALUES (?, ?, ?, 'info', ?, FALSE)",
        [tbId, "Yêu cầu nhập mới", `Có phiếu yêu cầu nhập thiết bị mới: ${maPhieu}`, m.ma_nguoi_dung]
      );
    }
    
    res.status(201).json({ success: true, maPhieu });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}

// Trưởng khoa / Admin duyệt
export async function approveImportRequest(req, res) {
  try {
    const { id } = req.params;
    const { approved, lyDo } = req.body;
    const userId = req.user.userId;
    
    const trangThai = approved ? 'DA_DUYET' : 'TU_CHOI';
    
    const [rows] = await pool.query("SELECT ma_nguoi_yeu_cau FROM phieu_yeu_cau_nhap WHERE ma_phieu = ?", [id]);
    const nguoiYeuCau = rows.length > 0 ? rows[0].ma_nguoi_yeu_cau : null;
    
    await pool.query(
      "UPDATE phieu_yeu_cau_nhap SET trang_thai = ?, ngay_duyet = NOW(), nguoi_duyet = ?, ly_do_tu_choi = ? WHERE ma_phieu = ?",
      [trangThai, userId, lyDo || null, id]
    );

    // Gửi thông báo cho nhân viên kho đã yêu cầu
    if (nguoiYeuCau) {
      const tbId = "TB-N-" + String(Date.now()).slice(-5) + Math.floor(Math.random() * 1000);
      const tieuDe = approved ? "Yêu cầu nhập đã duyệt" : "Yêu cầu nhập bị từ chối";
      const noiDung = approved ? `Phiếu yêu cầu nhập ${id} đã được duyệt.` : `Phiếu yêu cầu nhập ${id} đã bị từ chối.`;
      const loai = approved ? 'success' : 'error';
      await pool.query(
        "INSERT INTO thong_bao (id, tieu_de, noi_dung, loai, nguoi_nhan, da_doc) VALUES (?, ?, ?, ?, ?, FALSE)",
        [tbId, tieuDe, noiDung, loai, nguoiYeuCau]
      );
    }
    
    res.json({ success: true, message: approved ? "Đã duyệt" : "Đã từ chối" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
}
