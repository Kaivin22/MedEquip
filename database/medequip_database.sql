-- ============================================
-- MedEquip Database v4 — MySQL
-- Hệ thống Quản lý Kho Thiết bị Y tế Bệnh viện
-- ============================================

CREATE DATABASE IF NOT EXISTS medequip_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medequip_db;

-- 1. Bảng Người dùng (3 vai trò: ADMIN, NV_KHO, TRUONG_KHOA)
CREATE TABLE IF NOT EXISTS nguoi_dung (
    ma_nguoi_dung VARCHAR(20) PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    vai_tro ENUM('ADMIN','NV_KHO','TRUONG_KHOA') NOT NULL DEFAULT 'TRUONG_KHOA',
    ma_khoa VARCHAR(20) NULL,
    trang_thai BOOLEAN DEFAULT TRUE,
    so_lan_dang_nhap_sai INT DEFAULT 0,
    khoa_den DATETIME NULL,
    so_dien_thoai VARCHAR(20) NULL,
    dia_chi TEXT NULL,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_khoa) REFERENCES khoa(ma_khoa)
);

-- 2. Bảng Nhà cung cấp
CREATE TABLE IF NOT EXISTS nha_cung_cap (
    ma_nha_cung_cap VARCHAR(20) PRIMARY KEY,
    ten_nha_cung_cap VARCHAR(200) NOT NULL,
    dia_chi TEXT,
    so_dien_thoai VARCHAR(20),
    email VARCHAR(100),
    trang_thai BOOLEAN DEFAULT TRUE,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Bảng Khoa
CREATE TABLE IF NOT EXISTS khoa (
    ma_khoa VARCHAR(20) PRIMARY KEY,
    ten_khoa VARCHAR(100) NOT NULL,
    mo_ta TEXT,
    trang_thai BOOLEAN DEFAULT TRUE,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Bảng Thiết bị (v4: thêm loai_thiet_bi ENUM, he_so_quy_doi, serial_number, nguong_canh_bao)
CREATE TABLE IF NOT EXISTS thiet_bi (
    ma_thiet_bi VARCHAR(20) PRIMARY KEY,
    ten_thiet_bi VARCHAR(200) NOT NULL,
    loai_thiet_bi ENUM('VAT_TU_TIEU_HAO', 'TAI_SU_DUNG') NOT NULL DEFAULT 'TAI_SU_DUNG',
    don_vi_tinh VARCHAR(50) DEFAULT 'Cái',
    he_so_quy_doi INT DEFAULT 1 COMMENT '1 thùng = N cái',
    serial_number VARCHAR(100) DEFAULT NULL COMMENT 'Chỉ dùng cho TAI_SU_DUNG',
    nguong_canh_bao INT DEFAULT 10 COMMENT 'Cảnh báo khi tồn kho xuống dưới mức này',
    mo_ta TEXT,
    ma_nha_cung_cap VARCHAR(20),
    hinh_anh VARCHAR(500) DEFAULT NULL COMMENT 'URL ảnh từ internet',
    trang_thai BOOLEAN DEFAULT TRUE,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap)
);

-- 5. Bảng Tồn kho
CREATE TABLE IF NOT EXISTS ton_kho (
    ma_ton_kho VARCHAR(20) PRIMARY KEY,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    so_luong_kho INT DEFAULT 0,
    so_luong_hu INT DEFAULT 0,
    so_luong_dang_dung INT DEFAULT 0,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi)
);

-- 6. Bảng Phiếu yêu cầu cấp phát
CREATE TABLE IF NOT EXISTS phieu_yeu_cau (
    ma_phieu VARCHAR(30) PRIMARY KEY,
    ma_nguoi_yeu_cau VARCHAR(20) NOT NULL,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    ma_khoa VARCHAR(20) NOT NULL,
    so_luong_yeu_cau INT NOT NULL,
    ly_do TEXT,
    trang_thai ENUM('CHO_DUYET','DA_DUYET','TU_CHOI','DA_CAP_PHAT') DEFAULT 'CHO_DUYET',
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_duyet DATETIME NULL,
    nguoi_duyet VARCHAR(20) NULL,
    ly_do_tu_choi TEXT NULL,
    FOREIGN KEY (ma_nguoi_yeu_cau) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi),
    FOREIGN KEY (ma_khoa) REFERENCES khoa(ma_khoa)
);

-- 7. Bảng Phiếu cấp phát (v4: thêm ngay_du_kien_tra, ly_do_gia_han, trang_thai_tra)
CREATE TABLE IF NOT EXISTS phieu_cap_phat (
    ma_phieu VARCHAR(30) PRIMARY KEY,
    ma_phieu_yeu_cau VARCHAR(30) NOT NULL,
    ma_nguoi_cap VARCHAR(20) NOT NULL,
    ma_khoa_nhan VARCHAR(20) NOT NULL,
    ngay_cap DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_du_kien_tra DATE DEFAULT NULL COMMENT 'Chỉ áp dụng cho TAI_SU_DUNG',
    ly_do_gia_han TEXT DEFAULT NULL,
    trang_thai_tra ENUM('CHUA_TRA', 'YEU_CAU_TRA', 'DA_TRA', 'DA_GIA_HAN') DEFAULT 'CHUA_TRA',
    ghi_chu TEXT,
    FOREIGN KEY (ma_phieu_yeu_cau) REFERENCES phieu_yeu_cau(ma_phieu),
    FOREIGN KEY (ma_nguoi_cap) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_khoa_nhan) REFERENCES khoa(ma_khoa)
);

CREATE TABLE IF NOT EXISTS chi_tiet_cap_phat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_phieu_cap_phat VARCHAR(30) NOT NULL,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    so_luong INT NOT NULL,
    FOREIGN KEY (ma_phieu_cap_phat) REFERENCES phieu_cap_phat(ma_phieu),
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi)
);

-- 8. Bảng Phiếu nhập kho (v4: thêm trang_thai, nguoi_duyet, ly_do_tu_choi, ngay_duyet)
CREATE TABLE IF NOT EXISTS phieu_nhap_kho (
    ma_phieu VARCHAR(30) PRIMARY KEY,
    ma_nguoi_nhap VARCHAR(20) NOT NULL,
    ma_nha_cung_cap VARCHAR(20) NOT NULL,
    ngay_nhap DATETIME DEFAULT CURRENT_TIMESTAMP,
    ghi_chu TEXT,
    trang_thai ENUM('CHO_DUYET', 'DA_DUYET', 'TU_CHOI') DEFAULT 'DA_DUYET',
    nguoi_duyet VARCHAR(20) DEFAULT NULL,
    ly_do_tu_choi TEXT DEFAULT NULL,
    ngay_duyet DATETIME DEFAULT NULL,
    FOREIGN KEY (ma_nguoi_nhap) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap)
);

CREATE TABLE IF NOT EXISTS chi_tiet_nhap_kho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_phieu_nhap VARCHAR(30) NOT NULL,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    so_luong INT NOT NULL,
    don_gia DECIMAL(15,2) DEFAULT 0,
    don_vi_tinh VARCHAR(50) DEFAULT 'Cái',
    so_lo VARCHAR(50) NULL,
    han_su_dung DATE NULL,
    url_anh VARCHAR(500) DEFAULT NULL COMMENT 'URL ảnh từ internet',
    FOREIGN KEY (ma_phieu_nhap) REFERENCES phieu_nhap_kho(ma_phieu),
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi)
);

-- 9. Bảng Phiếu xuất kho (khi thiết bị rời khỏi bệnh viện)
CREATE TABLE IF NOT EXISTS phieu_xuat_kho (
    ma_phieu VARCHAR(30) PRIMARY KEY,
    ma_nguoi_xuat VARCHAR(20) NOT NULL,
    ma_khoa_nhan VARCHAR(20) NULL,
    ngay_xuat DATETIME DEFAULT CURRENT_TIMESTAMP,
    ly_do TEXT,
    ghi_chu TEXT,
    trang_thai ENUM('DA_LAP','DA_XUAT','DA_HUY') DEFAULT 'DA_LAP',
    FOREIGN KEY (ma_nguoi_xuat) REFERENCES nguoi_dung(ma_nguoi_dung)
);

CREATE TABLE IF NOT EXISTS chi_tiet_xuat_kho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_phieu_xuat VARCHAR(30) NOT NULL,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    so_luong INT NOT NULL,
    FOREIGN KEY (ma_phieu_xuat) REFERENCES phieu_xuat_kho(ma_phieu),
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi)
);

-- 10. Bảng Báo hư hỏng
CREATE TABLE IF NOT EXISTS phieu_bao_hu_hong (
    ma_phieu VARCHAR(30) PRIMARY KEY,
    ma_nguoi_bao VARCHAR(20) NOT NULL,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    ma_khoa VARCHAR(20),
    mo_ta TEXT NOT NULL,
    so_luong_hu INT DEFAULT 1,
    muc_do ENUM('NHE','TRUNG_BINH','NANG') DEFAULT 'TRUNG_BINH',
    trang_thai ENUM('CHO_XU_LY','DANG_XU_LY','DA_XU_LY') DEFAULT 'CHO_XU_LY',
    hinh_anh LONGTEXT,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_xu_ly DATETIME NULL,
    nguoi_xu_ly VARCHAR(20) NULL,
    ket_qua_xu_ly TEXT NULL,
    FOREIGN KEY (ma_nguoi_bao) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi),
    FOREIGN KEY (ma_khoa) REFERENCES khoa(ma_khoa)
);

-- 11. Bảng Thông báo
CREATE TABLE IF NOT EXISTS thong_bao (
    id VARCHAR(20) PRIMARY KEY,
    tieu_de VARCHAR(200) NOT NULL,
    noi_dung TEXT,
    loai ENUM('info','warning','success','error') DEFAULT 'info',
    nguoi_nhan VARCHAR(20) NOT NULL,
    da_doc BOOLEAN DEFAULT FALSE,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoi_nhan) REFERENCES nguoi_dung(ma_nguoi_dung)
);

-- 12. Bảng Phiếu trả thiết bị (mới v4)
CREATE TABLE IF NOT EXISTS phieu_tra_thiet_bi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_phieu_tra VARCHAR(50) UNIQUE NOT NULL,
    ma_phieu_cap_phat VARCHAR(30) NOT NULL,
    ma_truong_khoa VARCHAR(20) NOT NULL,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    trang_thai ENUM('CHO_XAC_NHAN', 'DA_TRA', 'TU_CHOI') DEFAULT 'CHO_XAC_NHAN',
    qr_data TEXT COMMENT 'JSON encode danh sách thiết bị trả',
    ghi_chu TEXT,
    FOREIGN KEY (ma_phieu_cap_phat) REFERENCES phieu_cap_phat(ma_phieu),
    FOREIGN KEY (ma_truong_khoa) REFERENCES nguoi_dung(ma_nguoi_dung)
);

CREATE TABLE IF NOT EXISTS chi_tiet_phieu_tra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_phieu_tra INT NOT NULL,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    so_luong INT NOT NULL DEFAULT 1,
    tinh_trang_khi_tra ENUM('NGUYEN_SEAL', 'DA_BOC_SEAL', 'HONG') DEFAULT 'DA_BOC_SEAL',
    anh_chung_minh TEXT COMMENT 'URL ảnh chứng minh',
    FOREIGN KEY (ma_phieu_tra) REFERENCES phieu_tra_thiet_bi(id)
);

-- ============================================
-- DỮ LIỆU MẪU (mật khẩu: 123456 — đã hash bcrypt)
-- ============================================

INSERT IGNORE INTO nguoi_dung (ma_nguoi_dung, ho_ten, email, mat_khau, vai_tro, ma_khoa) VALUES
('ND-001', 'Nguyễn Văn Admin', 'admin@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'ADMIN', NULL),
('ND-002', 'Trần Thị Kho', 'kho@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'NV_KHO', NULL),
('ND-003', 'Trưởng khoa Nội', 'khoanoi@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'TRUONG_KHOA', 'K-001'),
('ND-004', 'Trưởng khoa Ngoại', 'khoangoai@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'TRUONG_KHOA', 'K-002'),
('ND-005', 'Trưởng khoa Sản', 'khoasan@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'TRUONG_KHOA', 'K-003'),
('ND-006', 'Trưởng khoa Nhi', 'khoanhi@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'TRUONG_KHOA', 'K-004'),
('ND-007', 'Trưởng khoa Cấp cứu', 'khoacapcuu@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'TRUONG_KHOA', 'K-005');

INSERT IGNORE INTO khoa VALUES
('K-001', 'Khoa Nội', 'Khoa Nội tổng hợp', TRUE, NOW(), NOW()),
('K-002', 'Khoa Ngoại', 'Khoa Ngoại tổng hợp', TRUE, NOW(), NOW()),
('K-003', 'Khoa Sản', 'Khoa Sản phụ khoa', TRUE, NOW(), NOW()),
('K-004', 'Khoa Nhi', 'Khoa Nhi đồng', TRUE, NOW(), NOW()),
('K-005', 'Khoa Cấp cứu', 'Khoa Cấp cứu và hồi sức', TRUE, NOW(), NOW());

INSERT IGNORE INTO thong_bao VALUES
('TB-N-001', 'Hệ thống đã nâng cấp', 'MedEquip đã được cập nhật lên v4. Các tính năng mới: Upload Excel nhập kho, Trả thiết bị, Gia hạn mượn, QR code.', 'info', 'ND-001', FALSE, NOW()),
('TB-N-002', 'Hướng dẫn nạp dữ liệu ban đầu', 'Vui lòng: 1) Tạo NCC qua trang Nhà cung cấp, 2) Upload file Excel nhập kho để khởi tạo danh mục và tồn kho.', 'warning', 'ND-002', FALSE, NOW());
