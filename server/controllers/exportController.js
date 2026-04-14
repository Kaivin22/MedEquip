import { pool } from "../config/db.js";
import * as XLSX from "xlsx";

// ──────────────────────────────────────────────
// GET /exports — Lịch sử xuất kho
// ──────────────────────────────────────────────
export async function getAllExports(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM phieu_xuat_kho ORDER BY ngay_xuat DESC");
    const result = [];
    for (const row of rows) {
      const [details] = await pool.query(
        `SELECT c.*, COALESCE(t.ten_thiet_bi, c.ma_thiet_bi) as ten_thiet_bi, t.don_vi_co_so
         FROM chi_tiet_xuat_kho c
         LEFT JOIN thiet_bi t ON c.ma_thiet_bi = t.ma_thiet_bi
         WHERE c.ma_phieu_xuat = ?`,
        [row.ma_phieu]
      );

      if (details.length > 0) {
        for (const d of details) {
          result.push({
            maPhieu: row.ma_phieu,
            maNhanVienKho: row.ma_nguoi_xuat,
            ngayXuat: row.ngay_xuat,
            lyDoXuat: row.ly_do || "",
            trangThai: row.trang_thai,
            maThietBi: d.ma_thiet_bi,
            tenThietBi: d.ten_thiet_bi,
            soLuong: d.so_luong,
            donViTinh: d.don_vi_co_so || "Cái"
          });
        }
      } else {
        result.push({
          maPhieu: row.ma_phieu,
          maNhanVienKho: row.ma_nguoi_xuat,
          ngayXuat: row.ngay_xuat,
          lyDoXuat: row.ly_do || "",
          trangThai: row.trang_thai,
          maThietBi: "", tenThietBi: "", soLuong: 0, donViTinh: "Cái"
        });
      }
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
}

// ──────────────────────────────────────────────
// POST /exports — Tạo phiếu xuất kho thủ công (form UI)
// Body: { lyDo, items: [{maThietBi, soLuong}] }
// ──────────────────────────────────────────────
export async function createExportManual(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { lyDo, items } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Danh sách thiết bị xuất không được để trống." });
    }

    // Validate từng dòng
    const errors = [];
    for (const item of items) {
      if (!item.maThietBi) { errors.push(`Thiếu mã thiết bị`); continue; }
      const soLuong = parseInt(item.soLuong) || 0;
      if (soLuong <= 0) { errors.push(`${item.maThietBi}: Số lượng phải > 0`); continue; }

      const [inv] = await conn.query(
        "SELECT so_luong_kho FROM ton_kho WHERE ma_thiet_bi = ?",
        [item.maThietBi]
      );
      if (inv.length === 0) {
        errors.push(`${item.maThietBi}: Không tìm thấy trong kho`);
      } else if (inv[0].so_luong_kho < soLuong) {
        errors.push(`${item.maThietBi}: Không đủ tồn kho (Hiện có: ${inv[0].so_luong_kho}, Yêu cầu: ${soLuong})`);
      }
    }

    if (errors.length > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: errors.join("; ") });
    }

    const userId = req.user.userId;
    const phieuId = "XK-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(Date.now()).slice(-4);

    await conn.query(
      "INSERT INTO phieu_xuat_kho (ma_phieu, ma_nguoi_xuat, ngay_xuat, ly_do, trang_thai) VALUES (?, ?, NOW(), ?, 'DA_XUAT')",
      [phieuId, userId, lyDo || "Xuất kho"]
    );

    for (const item of items) {
      const soLuong = parseInt(item.soLuong);

      // Trừ tồn kho
      await conn.query(
        "UPDATE ton_kho SET so_luong_kho = so_luong_kho - ? WHERE ma_thiet_bi = ?",
        [soLuong, item.maThietBi]
      );

      // Ghi chi tiết phiếu xuất
      await conn.query(
        "INSERT INTO chi_tiet_xuat_kho (ma_phieu_xuat, ma_thiet_bi, so_luong) VALUES (?, ?, ?)",
        [phieuId, item.maThietBi, soLuong]
      );
    }

    await conn.commit();
    res.json({
      success: true,
      message: `Đã tạo phiếu xuất kho thành công. Mã phiếu: ${phieuId}`,
      maPhieu: phieuId
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + err.message });
  } finally {
    conn.release();
  }
}

// ──────────────────────────────────────────────
// GET /exports/excel — Xuất lịch sử xuất kho ra file Excel
// ──────────────────────────────────────────────
export async function exportToExcel(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT px.ma_phieu, px.ngay_xuat, cx.so_luong,
             COALESCE(tb.ten_thiet_bi, cx.ma_thiet_bi) as ten_thiet_bi,
             COALESCE(tb.don_vi_co_so, 'Cái') as don_vi_tinh,
             px.ly_do, nd.ho_ten as nguoi_lap, px.trang_thai
      FROM phieu_xuat_kho px
      LEFT JOIN chi_tiet_xuat_kho cx ON px.ma_phieu = cx.ma_phieu_xuat
      LEFT JOIN thiet_bi tb ON cx.ma_thiet_bi = tb.ma_thiet_bi
      LEFT JOIN nguoi_dung nd ON px.ma_nguoi_xuat = nd.ma_nguoi_dung
      ORDER BY px.ngay_xuat DESC
    `);

    const data = rows.map(r => ({
      "Mã phiếu": r.ma_phieu,
      "Ngày xuất": r.ngay_xuat ? new Date(r.ngay_xuat).toLocaleString("vi-VN") : "",
      "Thiết bị": r.ten_thiet_bi,
      "Số lượng": r.so_luong,
      "Đơn vị": r.don_vi_tinh,
      "Lý do": r.ly_do || "",
      "Người lập": r.nguoi_lap || "",
      "Trạng thái": r.trang_thai || ""
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 18 }, { wch: 20 }, { wch: 25 },
      { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lịch sử xuất kho");

    // Dùng type:"array" để tránh bug ESM
    const arrayBuf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const buffer = Buffer.from(new Uint8Array(arrayBuf));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=lich_su_xuat_kho.xlsx");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xuất file" });
  }
}
