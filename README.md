# MedEquip - Hệ thống Quản lý Kho Thiết bị Y tế Bệnh viện

## Cấu trúc dự án

```
MedEquip/
├── client/          # Frontend React + Vite + TypeScript
├── server/          # Backend Node.js + Express + MySQL
└── database/        # SQL schema + dữ liệu mẫu
```

## Cài đặt và Chạy

### 1. Database (MySQL)
```bash
mysql -u root -p < database/medequip_database.sql
```

### 2. Backend
```bash
cd server
npm install
# Cấu hình .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
npm run dev
```
Backend chạy tại: http://localhost:5000

### 3. Frontend
```bash
cd client
npm install
npm run dev
```
Frontend chạy tại: http://localhost:5173

## Chế độ hoạt động

- **API mode** (mặc định): `VITE_USE_MOCK=false` - Kết nối MySQL qua backend
- **Mock mode**: `VITE_USE_MOCK=true` - Dùng localStorage (demo không cần backend)

Để chuyển sang mock mode: copy `.env.mock` thành `.env`

## Tài khoản mẫu (mật khẩu: 123456)
- Admin: admin@benhvien.vn
- NV Kho: kho@benhvien.vn
- Trưởng Khoa: truongkhoa@benhvien.vn
- NV Bệnh viện: nvbv@benhvien.vn

## Các sửa đổi chính (v3)
- ✅ Frontend kết nối MySQL qua REST API (không còn chỉ localStorage)
- ✅ Sửa route backend khớp frontend (approve-mgr, confirm export, process request)
- ✅ Sửa format dữ liệu backend khớp frontend types (flat format)
- ✅ Thêm cột `so_luong_hu` vào bảng `phieu_bao_hu_hong`
- ✅ Thêm cột `trang_thai` vào bảng `phieu_xuat_kho`
- ✅ Thêm hình ảnh thiết bị vào dữ liệu mẫu
- ✅ Loại bỏ 20 thư viện không cần thiết
- ✅ Tạo lớp apiSync để đồng bộ store ↔ API
- ✅ Tạo dataLoader để tải dữ liệu từ API sau đăng nhập
