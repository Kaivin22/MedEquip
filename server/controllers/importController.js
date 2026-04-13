import { pool } from "../config/db.js";
import * as XLSX from "xlsx";

// ──────────────────────────────────────────────
// GET /imports — Lịch sử nhập kho
// ──────────────────────────────────────────────
export async function getAllImports(req, res) {
  try {
    let sql = `
      SELECT DISTINCT p.*, n.ten_nha_cung_cap, u.ho_ten as ten_nhan_vien
      FROM phieu_nhap_kho p
      LEFT JOIN chi_tiet_nhap_kho c ON p.ma_phieu = c.ma_phieu_nhap
      LEFT JOIN thiet_bi t ON c.ma_thiet_bi = t.ma_thiet_bi
      LEFT JOIN nha_cung_cap n ON p.ma_nha_cung_cap = n.ma_nha_cung_cap
      LEFT JOIN nguoi_dung u ON p.ma_nguoi_nhap = u.ma_nguoi_dung
      WHERE 1=1
    `;
    const params = [];
    if (req.query.fromDate) { sql += " AND p.ngay_nhap >= ?"; params.push(req.query.fromDate); }
    if (req.query.toDate) { sql += " AND p.ngay_nhap <= ?"; params.push(req.query.toDate); }
    if (req.query.maNhaCungCap) { sql += " AND p.ma_nha_cung_cap = ?"; params.push(req.query.maNhaCungCap); }
    
    if (req.query.search) {
      const keyword = `%${req.query.search}%`;
      sql += ` AND (
        p.ma_phieu LIKE ? OR 
        t.ten_thiet_bi LIKE ? OR 
        n.ten_nha_cung_cap LIKE ? OR 
        u.ho_ten LIKE ?
      )`;
      params.push(keyword, keyword, keyword, keyword);
    }

    // Sort DESC (newest first)
    sql += " ORDER BY p.ngay_nhap DESC, p.ma_phieu DESC";
    const [rows] = await pool.query(sql, params);

    const result = [];
    for (const row of rows) {
      const [details] = await pool.query(
        `SELECT c.*, COALESCE(t.ten_thiet_bi, c.ma_thiet_bi) as ten_thiet_bi
         FROM chi_tiet_nhap_kho c
         LEFT JOIN thiet_bi t ON c.ma_thiet_bi = t.ma_thiet_bi
         WHERE c.ma_phieu_nhap = ?`,
        [row.ma_phieu]
      );
      for (const d of details) {
        result.push({
          maPhieu: row.ma_phieu,
          maNhaCungCap: row.ma_nha_cung_cap,
          tenNhaCungCap: row.ten_nha_cung_cap || "",
          maNhanVienKho: row.ma_nguoi_nhap,
          tenNhanVienKho: row.ten_nhan_vien || "",
          ngayNhap: row.ngay_nhap,
          ghiChu: row.ghi_chu || "",
          maThietBi: d.ma_thiet_bi,
          tenThietBi: d.ten_thiet_bi || d.ma_thiet_bi,
          soLuongNhap: d.so_luong,
          donViTinh: d.don_vi_tinh || "Cái",
          donGia: d.don_gia || 0,
          soLo: d.so_lo || "",
          hanSuDung: d.han_su_dung || null,
          urlAnh: d.url_anh || "",
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
          tenNhaCungCap: row.ten_nha_cung_cap || "",
          maNhanVienKho: row.ma_nguoi_nhap,
          tenNhanVienKho: row.ten_nhan_vien || "",
          ngayNhap: row.ngay_nhap,
          ghiChu: row.ghi_chu || "",
          maThietBi: "", tenThietBi: "", soLuongNhap: 0,
          trangThai: row.trang_thai || "DA_DUYET",
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
// POST /imports/from-excel — Parse file Excel, trả về preview (KHÔNG ghi DB)
// ──────────────────────────────────────────────
export async function parseExcelPreview(req, res) {
  try {
    if (!req.file) return res.json({ success: false, message: "Vui lòng chọn file Excel (.xlsx)" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.json({ success: false, message: "File Excel không có sheet nào hợp lệ." });
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    console.log(`[DEBUG] Parsing Excel. Rows found: ${rows.length}`);
    if (rows.length > 0) {
      console.log("[DEBUG] First row keys:", Object.keys(rows[0]));
    }

    if (rows.length === 0) {
      return res.json({ success: false, message: "File Excel không có dữ liệu (Row count = 0)." });
    }

    // Lấy danh sách NCC để validate
    const [nccList] = await pool.query("SELECT ma_nha_cung_cap FROM nha_cung_cap WHERE trang_thai = TRUE");
    const nccSet = new Set(nccList.map(n => n.ma_nha_cung_cap));

    // Lấy danh sách thiết bị hiện có
    const [tbList] = await pool.query("SELECT ma_thiet_bi, ten_thiet_bi FROM thiet_bi");
    const tbMap = {};
    for (const tb of tbList) tbMap[tb.ma_thiet_bi] = tb.ten_thiet_bi;

    const preview = rows.map((row, idx) => {
      const errors = [];
      const maThietBi   = String(row.ma_thiet_bi || "").trim();
      const tenThietBi  = String(row.ten_thiet_bi || "").trim();
      const loai        = String(row.loai || "").trim();
      const soLuong     = parseInt(row.so_luong) || 0;
      const donViTinh   = String(row.don_vi_tinh || "Cái").trim();
      const heSoQuyDoi  = parseInt(row.he_so_quy_doi) || 1;
      const donGia      = parseFloat(row.don_gia) || 0;
      const soLo        = String(row.so_lo || "").trim();
      const hanSuDung   = String(row.han_su_dung || "").trim();
      const serialNumber = String(row.serial_number || "").trim();
      const maNcc       = String(row.ma_ncc || "").trim();
      const nguongCanhBao = parseInt(row.nguong_canh_bao) || 10;
      const urlAnh      = String(row.url_anh || "").trim();
      const ghiChu      = String(row.ghi_chu || "").trim();

      if (!maThietBi) errors.push("Thiếu mã thiết bị");
      if (!tenThietBi) errors.push("Thiếu tên thiết bị");
      if (!["VAT_TU_TIEU_HAO", "TAI_SU_DUNG"].includes(loai)) errors.push("Loại phải là VAT_TU_TIEU_HAO hoặc TAI_SU_DUNG");
      if (soLuong <= 0) errors.push("Số lượng phải > 0");
      if (!donViTinh) errors.push("Thiếu đơn vị tính");
      if (!maNcc) errors.push("Thiếu mã NCC");
      if (maNcc && !nccSet.has(maNcc)) errors.push(`Nhà cung cấp "${maNcc}" không tồn tại trong hệ thống`);
      if (loai === "VAT_TU_TIEU_HAO") {
        if (!soLo) errors.push("Vật tư tiêu hao cần có số lô");
        if (!hanSuDung) errors.push("Vật tư tiêu hao cần có hạn sử dụng");
      }

      const isNew = maThietBi && !tbMap[maThietBi];
      const action = isNew ? "CREATE" : "UPDATE";

      return {
        rowIndex: idx + 2, // Dòng trong Excel (1-indexed, header ở dòng 1)
        maThietBi, tenThietBi, loai, soLuong, donViTinh, heSoQuyDoi,
        donGia, soLo, hanSuDung, serialNumber, maNcc, nguongCanhBao,
        urlAnh, ghiChu,
        action, // CREATE (mới) | UPDATE (cộng thêm)
        errors,
        hasError: errors.length > 0
      };
    });

    const totalErrors = preview.filter(r => r.hasError).length;
    res.json({
      success: true,
      preview,
      summary: {
        total: preview.length,
        errors: totalErrors,
        valid: preview.length - totalErrors,
        willCreate: preview.filter(r => !r.hasError && r.action === "CREATE").length,
        willUpdate: preview.filter(r => !r.hasError && r.action === "UPDATE").length,
      }
    });
  } catch (err) {
    console.error("DEBUG: Error in parseExcelPreview:", err);
    res.status(500).json({ success: false, message: "Lỗi đọc file Excel: " + err.message });
  }
}

// ──────────────────────────────────────────────
// POST /imports/confirm — Xác nhận nhập kho từ preview (UPSERT vào DB)
// ──────────────────────────────────────────────
export async function confirmImportFromExcel(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { rows, maNhaCungCap } = req.body || {};
    if (!rows || !Array.isArray(rows)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ." });
    }
    // rows: mảng từ preview, chỉ lấy các row không có lỗi
    const validRows = rows.filter(r => !r.hasError);
    if (validRows.length === 0) {
      await conn.rollback();
      return res.json({ success: false, message: "Không có dòng hợp lệ để nhập." });
    }

    const userId = req.user.userId;
    const phieuId = "NK-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Date.now()).slice(-4);
    const nccId = maNhaCungCap || validRows[0]?.maNcc;

    // Tạo phiếu nhập kho
    await conn.query(
      "INSERT INTO phieu_nhap_kho (ma_phieu, ma_nguoi_nhap, ma_nha_cung_cap, ngay_nhap, ghi_chu) VALUES (?, ?, ?, NOW(), ?)",
      [phieuId, userId, nccId, `Nhập kho từ Excel (${validRows.length} dòng)`]
    );

    for (const row of validRows) {
      const { maThietBi, tenThietBi, loai, soLuong, donViTinh, heSoQuyDoi,
              donGia, soLo, hanSuDung, serialNumber, maNcc, nguongCanhBao, urlAnh } = row;

      // UPSERT thiet_bi
      const [existing] = await conn.query("SELECT ma_thiet_bi FROM thiet_bi WHERE ma_thiet_bi = ?", [maThietBi]);
      if (existing.length === 0) {
        // INSERT thiết bị mới
        await conn.query(
          `INSERT INTO thiet_bi (ma_thiet_bi, ten_thiet_bi, loai_thiet_bi, don_vi_tinh,
           ma_nha_cung_cap, hinh_anh, trang_thai)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
          [maThietBi, tenThietBi, loai, donViTinh,
           maNcc, urlAnh || ""]
        );
        // Insert tồn kho ban đầu
        const tkId = "TK-" + maThietBi;
        await conn.query(
          "INSERT INTO ton_kho (ma_ton_kho, ma_thiet_bi, so_luong_kho, so_luong_hu, so_luong_dang_dung) VALUES (?, ?, ?, 0, 0)",
          [tkId, maThietBi, soLuong]
        );
      } else {
        // Cộng thêm số lượng vào tồn kho
        await conn.query(
          "UPDATE ton_kho SET so_luong_kho = so_luong_kho + ? WHERE ma_thiet_bi = ?",
          [soLuong, maThietBi]
        );
        // Cập nhật URL ảnh nếu có trong Excel
        if (urlAnh) {
          await conn.query("UPDATE thiet_bi SET hinh_anh = ? WHERE ma_thiet_bi = ? AND (hinh_anh IS NULL OR hinh_anh = '')", [urlAnh, maThietBi]);
        }
      }

      // Ghi chi tiết phiếu nhập
      let hanSuDungDate = null;
      if (hanSuDung) {
        // Parse DD/MM/YYYY → YYYY-MM-DD
        const parts = hanSuDung.split("/");
        if (parts.length === 3) hanSuDungDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        else hanSuDungDate = hanSuDung;
      }

      await conn.query(
        `INSERT INTO chi_tiet_nhap_kho
         (ma_phieu_nhap, ma_thiet_bi, so_luong, don_gia, so_lo, han_su_dung)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [phieuId, maThietBi, soLuong, donGia, soLo || null, hanSuDungDate]
      );
    }

    await conn.commit();
    res.json({
      success: true,
      message: `Đã nhập kho thành công ${validRows.length} dòng. Mã phiếu: ${phieuId}`,
      maPhieu: phieuId
    });
  } catch (err) {
    await conn.rollback();
    await conn.rollback();
    console.error("DEBUG: Error in confirmImportFromExcel:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + err.message });
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + err.message });
  } finally {
    conn.release();
  }
}

// ──────────────────────────────────────────────
// GET /imports/template — Tải file Excel mẫu
// ──────────────────────────────────────────────
export async function downloadTemplate(req, res) {
  try {
    const wb = XLSX.utils.book_new();
    const headers = [
      "ma_thiet_bi", "ten_thiet_bi", "loai", "so_luong", "don_vi_tinh",
      "he_so_quy_doi", "don_gia", "so_lo", "han_su_dung", "serial_number",
      "ma_ncc", "nguong_canh_bao", "url_anh", "ghi_chu"
    ];
    const huongDan = [
      "Mã thiết bị (bắt buộc, VD: TB-001)",
      "Tên thiết bị (bắt buộc)",
      "TAI_SU_DUNG hoặc VAT_TU_TIEU_HAO",
      "Số lượng nhập (bắt buộc, > 0)",
      "Đơn vị tính (VD: Cái, Thùng, Hộp)",
      "Hệ số quy đổi (mặc định 1)",
      "Đơn giá (VND)",
      "Số lô (bắt buộc với VTTH)",
      "Hạn sử dụng DD/MM/YYYY (bắt buộc với VTTH)",
      "Số serial (chỉ cho TAI_SU_DUNG)",
      "Mã nhà cung cấp (bắt buộc, VD: NCC-001)",
      "Ngưỡng cảnh báo tồn kho (mặc định 10)",
      "URL hình ảnh (không bắt buộc)",
      "Ghi chú (không bắt buộc)"
    ];
    const example = [
      "TB-001", "Máy đo huyết áp", "TAI_SU_DUNG", 5, "Cái",
      1, 2500000, "", "", "SN-001",
      "NCC-001", 2, "https://example.com/image.jpg", "Thiết bị tái sử dụng"
    ];
    const example2 = [
      "VT-001", "Kim tiêm 5ml", "VAT_TU_TIEU_HAO", 20, "Thùng",
      1000, 120000, "LOT-2026-001", "31/12/2028", "",
      "NCC-002", 5, "https://example.com/needle.jpg", "1 thùng = 1000 cái"
    ];

    // Dòng 1: headers, Dòng 2: hướng dẫn, Dòng 3-4: ví dụ thực tế
    const ws = XLSX.utils.aoa_to_sheet([headers, huongDan, example, example2]);

    // Set column widths
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    XLSX.utils.book_append_sheet(wb, ws, "Nhập kho");

    // Dùng type:"array" để tránh bug ESM của xlsx@0.18.x
    const arrayBuf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const finalBuffer = Buffer.from(new Uint8Array(arrayBuf));

    console.log(`[DEBUG] Template generated. Size: ${finalBuffer.length} bytes`);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=template_nhap_kho.xlsx");
    res.setHeader("Content-Length", finalBuffer.length);
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(finalBuffer);
  } catch (err) {
    console.error("[ERROR] downloadTemplate:", err);
    return res.status(500).json({ success: false, message: "Lỗi tạo file mẫu: " + err.message });
  }
}

// ──────────────────────────────────────────────
// DELETE /imports/:id — Xóa lịch sử nhập kho (Admin)
// ──────────────────────────────────────────────
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
