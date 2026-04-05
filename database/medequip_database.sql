-- ============================================
-- MedEquip Database - MySQL
-- Hệ thống Quản lý Kho Thiết bị Y tế Bệnh viện
-- ============================================

CREATE DATABASE IF NOT EXISTS medequip_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medequip_db;

-- 1. Bảng Người dùng
CREATE TABLE nguoi_dung (
    ma_nguoi_dung VARCHAR(20) PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    vai_tro ENUM('ADMIN','NV_KHO','TRUONG_KHOA','NV_BV') NOT NULL DEFAULT 'NV_BV',
    trang_thai BOOLEAN DEFAULT TRUE,
    so_lan_dang_nhap_sai INT DEFAULT 0,
    khoa_den DATETIME NULL,
    so_dien_thoai VARCHAR(20) NULL,
    dia_chi TEXT NULL,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng Nhà cung cấp
CREATE TABLE nha_cung_cap (
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
CREATE TABLE khoa (
    ma_khoa VARCHAR(20) PRIMARY KEY,
    ten_khoa VARCHAR(100) NOT NULL,
    mo_ta TEXT,
    trang_thai BOOLEAN DEFAULT TRUE,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Bảng Thiết bị
CREATE TABLE thiet_bi (
    ma_thiet_bi VARCHAR(20) PRIMARY KEY,
    ten_thiet_bi VARCHAR(200) NOT NULL,
    loai_thiet_bi VARCHAR(50),
    don_vi_tinh VARCHAR(20),
    mo_ta TEXT,
    ma_nha_cung_cap VARCHAR(20),
    hinh_anh LONGTEXT,
    trang_thai BOOLEAN DEFAULT TRUE,
    da_xoa BOOLEAN NOT NULL DEFAULT FALSE,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap)
);

-- 5. Bảng Tồn kho
CREATE TABLE ton_kho (
    ma_ton_kho VARCHAR(20) PRIMARY KEY,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    so_luong_kho INT DEFAULT 0,
    so_luong_hu INT DEFAULT 0,
    so_luong_dang_dung INT DEFAULT 0,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi)
);

-- 6. Bảng Phiếu yêu cầu cấp phát
CREATE TABLE phieu_yeu_cau (
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
    FOREIGN KEY (ma_khoa) REFERENCES khoa(ma_khoa),
    FOREIGN KEY (nguoi_duyet) REFERENCES nguoi_dung(ma_nguoi_dung)
);

-- 7. Bảng Phiếu cấp phát
CREATE TABLE phieu_cap_phat (
    ma_phieu VARCHAR(30) PRIMARY KEY,
    ma_phieu_yeu_cau VARCHAR(30) NOT NULL,
    ma_nguoi_cap VARCHAR(20) NOT NULL,
    ma_khoa_nhan VARCHAR(20) NOT NULL,
    ngay_cap DATETIME DEFAULT CURRENT_TIMESTAMP,
    ghi_chu TEXT,
    FOREIGN KEY (ma_phieu_yeu_cau) REFERENCES phieu_yeu_cau(ma_phieu),
    FOREIGN KEY (ma_nguoi_cap) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_khoa_nhan) REFERENCES khoa(ma_khoa)
);

CREATE TABLE chi_tiet_cap_phat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_phieu_cap_phat VARCHAR(30) NOT NULL,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    so_luong INT NOT NULL,
    FOREIGN KEY (ma_phieu_cap_phat) REFERENCES phieu_cap_phat(ma_phieu),
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi)
);

-- 8. Bảng Phiếu nhập kho
CREATE TABLE phieu_nhap_kho (
    ma_phieu VARCHAR(30) PRIMARY KEY,
    ma_nguoi_nhap VARCHAR(20) NOT NULL,
    ma_nha_cung_cap VARCHAR(20) NOT NULL,
    ngay_nhap DATETIME DEFAULT CURRENT_TIMESTAMP,
    ghi_chu TEXT,
    FOREIGN KEY (ma_nguoi_nhap) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap)
);

CREATE TABLE chi_tiet_nhap_kho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_phieu_nhap VARCHAR(30) NOT NULL,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    so_luong INT NOT NULL,
    don_gia DECIMAL(15,2) DEFAULT 0,
    so_lo VARCHAR(50) NULL,
    han_su_dung DATE NULL,
    FOREIGN KEY (ma_phieu_nhap) REFERENCES phieu_nhap_kho(ma_phieu),
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi)
);

-- 9. Bảng Phiếu xuất kho (ma_khoa_nhan nullable - xuất kho có thể không thuộc khoa)
CREATE TABLE phieu_xuat_kho (
    ma_phieu VARCHAR(30) PRIMARY KEY,
    ma_nguoi_xuat VARCHAR(20) NOT NULL,
    ma_khoa_nhan VARCHAR(20) NULL,
    ngay_xuat DATETIME DEFAULT CURRENT_TIMESTAMP,
    ly_do TEXT,
    ghi_chu TEXT,
    trang_thai ENUM('DA_LAP','DA_XUAT','DA_HUY') DEFAULT 'DA_LAP',
    FOREIGN KEY (ma_nguoi_xuat) REFERENCES nguoi_dung(ma_nguoi_dung)
);

CREATE TABLE chi_tiet_xuat_kho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_phieu_xuat VARCHAR(30) NOT NULL,
    ma_thiet_bi VARCHAR(20) NOT NULL,
    so_luong INT NOT NULL,
    FOREIGN KEY (ma_phieu_xuat) REFERENCES phieu_xuat_kho(ma_phieu),
    FOREIGN KEY (ma_thiet_bi) REFERENCES thiet_bi(ma_thiet_bi)
);

-- 10. Bảng Báo hư hỏng (thêm so_luong_hu)
CREATE TABLE phieu_bao_hu_hong (
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
    FOREIGN KEY (ma_khoa) REFERENCES khoa(ma_khoa),
    FOREIGN KEY (nguoi_xu_ly) REFERENCES nguoi_dung(ma_nguoi_dung)
);

-- 11. Bảng Thông báo
CREATE TABLE thong_bao (
    id VARCHAR(20) PRIMARY KEY,
    tieu_de VARCHAR(200) NOT NULL,
    noi_dung TEXT,
    loai ENUM('info','warning','success','error') DEFAULT 'info',
    nguoi_nhan VARCHAR(20) NOT NULL,
    da_doc BOOLEAN DEFAULT FALSE,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoi_nhan) REFERENCES nguoi_dung(ma_nguoi_dung)
);

-- ============================================
-- DỮ LIỆU MẪU (mật khẩu: 123456 - đã hash bcrypt)
-- ============================================

INSERT INTO nguoi_dung VALUES
('ND-001', 'Nguyễn Văn Admin', 'admin@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'ADMIN', TRUE, 0, NULL, '0901000001', NULL, NOW(), NOW()),
('ND-002', 'Trần Thị Kho', 'kho@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'NV_KHO', TRUE, 0, NULL, '0901000002', NULL, NOW(), NOW()),
('ND-003', 'Lê Minh Khoa', 'truongkhoa@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'TRUONG_KHOA', TRUE, 0, NULL, '0901000003', NULL, NOW(), NOW()),
('ND-004', 'Phạm Thị BV', 'nvbv@benhvien.vn', '$2b$10$z04YEefPoGr2UnW5g.aS9uGaSqO0I.PelKqY0FH4nNVSs9M/W3VP.', 'NV_BV', TRUE, 0, NULL, '0901000004', NULL, NOW(), NOW());

INSERT INTO nha_cung_cap VALUES
('NCC-001', 'Công ty TNHH Thiết bị Y tế Phương Nam', '123 Nguyễn Văn Linh, Đà Nẵng', '0236-123-456', 'phuongnam@ytevn.com', TRUE, NOW(), NOW()),
('NCC-002', 'Công ty CP Y khoa Miền Trung', '456 Trần Phú, Huế', '0234-789-012', 'mientrung@yk.com', TRUE, NOW(), NOW()),
('NCC-003', 'Tập đoàn Medico Việt Nam', '789 Lê Lợi, TP.HCM', '028-345-678', 'info@medico.vn', TRUE, NOW(), NOW());

INSERT INTO khoa VALUES
('K-001', 'Khoa Nội', 'Khoa Nội tổng hợp', TRUE, NOW(), NOW()),
('K-002', 'Khoa Ngoại', 'Khoa Ngoại tổng hợp', TRUE, NOW(), NOW()),
('K-003', 'Khoa Sản', 'Khoa Sản phụ khoa', TRUE, NOW(), NOW()),
('K-004', 'Khoa Nhi', 'Khoa Nhi đồng', TRUE, NOW(), NOW()),
('K-005', 'Khoa Cấp cứu', 'Khoa Cấp cứu và hồi sức', TRUE, NOW(), NOW());

INSERT INTO thiet_bi VALUES
('TB-001', 'Máy đo huyết áp', 'Máy móc', 'Cái', 'Máy đo huyết áp tự động', 'NCC-001', 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&h=300&fit=crop', TRUE, NOW(), NOW()),
('TB-002', 'Ống nghe y khoa', 'Dụng cụ', 'Cái', 'Ống nghe chuyên khoa nội', 'NCC-001', 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=400&h=300&fit=crop', TRUE, NOW(), NOW()),
('TB-003', 'Máy siêu âm', 'Máy móc', 'Bộ', 'Máy siêu âm 4D', 'NCC-002', 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=300&fit=crop', TRUE, NOW(), NOW()),
('TB-004', 'Kim tiêm', 'Vật tư', 'Hộp', 'Kim tiêm 5ml vô trùng', 'NCC-003', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=300&fit=crop', TRUE, NOW(), NOW()),
('TB-005', 'Máy đo SpO2', 'Máy móc', 'Cái', 'Máy đo nồng độ oxy máu', 'NCC-001', 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=300&fit=crop', TRUE, NOW(), NOW());

INSERT INTO ton_kho VALUES
('TK-001', 'TB-001', 50, 2, 30, NOW()),
('TK-002', 'TB-002', 100, 5, 80, NOW()),
('TK-003', 'TB-003', 10, 0, 8, NOW()),
('TK-004', 'TB-004', 500, 10, 200, NOW()),
('TK-005', 'TB-005', 30, 1, 20, NOW());

INSERT INTO phieu_yeu_cau VALUES
('YCCF-20260320-001', 'ND-004', 'TB-001', 'K-001', 5, 'Phục vụ khám bệnh thường quy', 'CHO_DUYET', NOW(), NULL, NULL, NULL),
('YCCF-20260318-002', 'ND-004', 'TB-004', 'K-005', 50, 'Bổ sung vật tư tiêm chủng', 'DA_DUYET', '2026-03-18', '2026-03-19', 'ND-003', NULL);

INSERT INTO thong_bao VALUES
('TB-N-001', 'Phiếu yêu cầu mới', 'Có phiếu yêu cầu cấp phát mới từ NV Bệnh viện cần duyệt', 'info', 'ND-003', FALSE, NOW()),
('TB-N-002', 'Tồn kho thấp', 'Máy đo SpO2 chỉ còn 30 trong kho', 'warning', 'ND-002', FALSE, NOW()),
('TB-N-003', 'Phiếu đã duyệt', 'Phiếu yêu cầu YCCF-001 đã được Trưởng khoa phê duyệt', 'success', 'ND-004', TRUE, NOW());

-- 12. Bảng Phiếu yêu cầu nhập (cho chức năng đề xuất nhập thiết bị mới - US-018)
CREATE TABLE IF NOT EXISTS phieu_yeu_cau_nhap (
    ma_phieu VARCHAR(30) PRIMARY KEY,
    ma_nguoi_yeu_cau VARCHAR(20) NOT NULL,
    ten_thiet_bi VARCHAR(200) NOT NULL,
    loai_thiet_bi VARCHAR(50),
    don_vi_tinh VARCHAR(20),
    so_luong INT NOT NULL,
    muc_dich_su_dung TEXT,
    trang_thai ENUM('CHO_DUYET','DA_DUYET','TU_CHOI','DA_NHAP') DEFAULT 'CHO_DUYET',
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_duyet DATETIME NULL,
    nguoi_duyet VARCHAR(20) NULL,
    ly_do_tu_choi TEXT NULL,
    FOREIGN KEY (ma_nguoi_yeu_cau) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (nguoi_duyet) REFERENCES nguoi_dung(ma_nguoi_dung)
);
