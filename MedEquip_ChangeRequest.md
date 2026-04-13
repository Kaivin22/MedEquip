# MedEquip — Yêu cầu thay đổi & Hướng dẫn implement

> **Dành cho AI coding assistant (Antigravity).**  
> Đây là danh sách thay đổi cho dự án MedEquip (React + Vite + Node.js + MySQL).  
> Đọc toàn bộ file này trước khi bắt đầu bất kỳ thay đổi nào.  
> Thực hiện theo đúng thứ tự ưu tiên bên dưới.

---

## PHẦN 0 — DỌN DẸP THƯ VIỆN (Làm trước tiên)

Dự án đang có dung lượng ~300MB, vượt mức bình thường. Nguyên nhân chính là `node_modules` và các thư viện không dùng đến. Thực hiện các bước sau:

### 0.1 — Xóa node_modules và cài lại sạch
```bash
# Xóa node_modules cả client và server
rm -rf client/node_modules server/node_modules node_modules

# Cài lại chỉ production dependencies
cd client && npm install
cd ../server && npm install
```

### 0.2 — Kiểm tra và gỡ các package không dùng trong client/package.json

Chạy lệnh sau để phát hiện package không dùng, sau đó gỡ từng cái:
```bash
cd client
npx depcheck
```

Các package **có thể gỡ nếu không dùng** (kiểm tra trước khi xóa):
- `framer-motion` — nếu chỉ dùng hiệu ứng animation nhỏ, thay bằng CSS transition
- `@radix-ui/*` — chỉ giữ các component đang dùng thực sự trong code
- `recharts` — giữ lại nếu có biểu đồ, gỡ nếu không có trang nào dùng
- `xlsx` — giữ lại vì sẽ dùng cho tính năng Excel mới
- `date-fns` — giữ lại nếu có xử lý ngày tháng, gỡ nếu chỉ dùng `new Date()`
- `react-hook-form` + `zod` — giữ lại nếu có form validation phức tạp
- Bất kỳ package nào trong devDependencies không dùng cho build/test thực sự

### 0.3 — Thêm .gitignore đúng chuẩn (nếu chưa có)
Đảm bảo `.gitignore` chứa:
```
node_modules/
dist/
build/
.env
*.log
```

### 0.4 — Kiểm tra file .env không commit vào repo
Nếu có file `.env` hoặc `.env.local` trong repo, xóa khỏi git tracking:
```bash
git rm --cached .env
git rm --cached client/.env
git rm --cached server/.env
```

---

## PHẦN 1 — THAY ĐỔI DATABASE (Làm trước tất cả frontend/backend)

> **Quan trọng:** Làm DB migration trước. Tất cả các tính năng bên dưới phụ thuộc vào schema mới.

### 1.1 — Thêm cột `loai_thiet_bi` vào bảng `thiet_bi`
```sql
ALTER TABLE thiet_bi 
ADD COLUMN loai_thiet_bi ENUM('VAT_TU_TIEU_HAO', 'TAI_SU_DUNG') NOT NULL DEFAULT 'TAI_SU_DUNG',
ADD COLUMN don_vi_tinh VARCHAR(50) DEFAULT 'Cái',
ADD COLUMN he_so_quy_doi INT DEFAULT 1 COMMENT '1 thùng = N cái',
ADD COLUMN serial_number VARCHAR(100) DEFAULT NULL COMMENT 'Chỉ dùng cho TAI_SU_DUNG',
ADD COLUMN nguong_canh_bao INT DEFAULT 10 COMMENT 'Cảnh báo khi tồn kho xuống dưới mức này';
```

### 1.2 — Cập nhật bảng `phieu_cap_phat` thêm thông tin hạn mượn
```sql
ALTER TABLE phieu_cap_phat
ADD COLUMN ngay_du_kien_tra DATE DEFAULT NULL COMMENT 'Chỉ áp dụng cho TAI_SU_DUNG',
ADD COLUMN ly_do_gia_han TEXT DEFAULT NULL,
ADD COLUMN trang_thai_tra ENUM('CHUA_TRA', 'YEU_CAU_TRA', 'DA_TRA', 'DA_GIA_HAN') DEFAULT 'CHUA_TRA';
```

### 1.3 — Tạo bảng `phieu_tra_thiet_bi` (mới)
```sql
CREATE TABLE phieu_tra_thiet_bi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_phieu_tra VARCHAR(50) UNIQUE NOT NULL,
  ma_phieu_cap_phat INT NOT NULL,
  ma_truong_khoa INT NOT NULL,
  ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
  trang_thai ENUM('CHO_XAC_NHAN', 'DA_TRA', 'TU_CHOI') DEFAULT 'CHO_XAC_NHAN',
  qr_data TEXT COMMENT 'JSON encode danh sách thiết bị trả',
  ghi_chu TEXT,
  FOREIGN KEY (ma_phieu_cap_phat) REFERENCES phieu_cap_phat(id),
  FOREIGN KEY (ma_truong_khoa) REFERENCES nguoi_dung(id)
);
```

### 1.4 — Tạo bảng `chi_tiet_phieu_tra` (mới)
```sql
CREATE TABLE chi_tiet_phieu_tra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_phieu_tra INT NOT NULL,
  ma_thiet_bi INT NOT NULL,
  so_luong INT NOT NULL DEFAULT 1,
  tinh_trang_khi_tra ENUM('NGUYEN_SEAL', 'DA_BOC_SEAL', 'HONG') DEFAULT 'DA_BOC_SEAL',
  anh_chung_minh TEXT COMMENT 'Base64 hoặc URL ảnh — chỉ dùng cho NGUYEN_SEAL',
  FOREIGN KEY (ma_phieu_tra) REFERENCES phieu_tra_thiet_bi(id)
);
```

### 1.5 — Cập nhật bảng `nguoi_dung`: xóa role NV_BV
```sql
ALTER TABLE nguoi_dung 
MODIFY COLUMN vai_tro ENUM('ADMIN', 'NV_KHO', 'TRUONG_KHOA') NOT NULL DEFAULT 'TRUONG_KHOA';

-- Cập nhật record cũ nếu có
UPDATE nguoi_dung SET vai_tro = 'TRUONG_KHOA' WHERE vai_tro = 'NV_BV';
```

---

## PHẦN 2 — DỌN BACKEND (server/)

### 2.1 — Xóa hoàn toàn module "yêu cầu nhập mới"
Xóa hoặc comment out:
- `server/routes/importRequests.js` (hoặc tên tương tự)
- Dòng `app.use('/import-requests', ...)` trong `server/index.js`
- Bất kỳ reference nào đến `phieu_yeu_cau_nhap` trong các file khác

### 2.2 — Xóa role NV_BV khỏi middleware
Tìm tất cả file trong `server/middleware/` và `server/routes/` có check `vai_tro === 'NV_BV'` → đổi thành `'TRUONG_KHOA'`.

### 2.3 — Cập nhật route `/equipment` — thêm filter theo loại
```js
// GET /equipment?loai=VAT_TU_TIEU_HAO hoặc TAI_SU_DUNG
// GET /equipment?sort=ton_kho_asc | ton_kho_desc | ngay_nhap_asc | ngay_nhap_desc
// Thêm WHERE loai_thiet_bi = ? khi có query param
// Thêm ORDER BY logic tương ứng
```

### 2.4 — Cập nhật route `/inventory` — cảnh báo tồn kho thấp
```js
// GET /inventory/low-stock
// Trả về: SELECT * FROM ton_kho t JOIN thiet_bi tb ON t.ma_thiet_bi = tb.id 
//          WHERE t.so_luong_trong_kho < tb.nguong_canh_bao
```

### 2.5 — Thêm route nhập kho từ Excel
```js
// POST /imports/from-excel
// Body: multipart/form-data, field "file" là file .xlsx
// Logic: parse file, validate từng row, trả về preview JSON
// Client confirm → POST /imports/confirm để tạo phiếu thật
// Dùng thư viện 'xlsx' (đã có trong package.json)
```

**Cột bắt buộc trong file Excel nhập kho:**
| Tên cột | Bắt buộc | Ghi chú |
|---|---|---|
| ma_thiet_bi | Có | Match với danh mục |
| ten_thiet_bi | Có | |
| loai | Có | VAT_TU_TIEU_HAO hoặc TAI_SU_DUNG |
| so_luong | Có | Số nguyên dương |
| don_vi_tinh | Có | Cái, Hộp, Thùng, Chai... |
| don_gia | Có | |
| so_lo | Với tiêu hao | |
| han_su_dung | Với tiêu hao | Format: DD/MM/YYYY |
| ma_ncc | Có | Tên hoặc mã NCC |
| ghi_chu | Không | |
| url_anh | Không | URL ảnh, không nhúng ảnh vào Excel |

> **Lưu ý:** Không nhúng ảnh trực tiếp vào cell Excel — file sẽ rất nặng và không parse được. Dùng cột url_anh hoặc bỏ qua trường ảnh trong file Excel.

### 2.6 — Làm rõ điểm 4 (Xuất kho)
> **Điểm 4 trong yêu cầu gốc bị mơ hồ.** Implement theo cách sau:
> - Xóa nút "Lập phiếu xuất" thủ công (đúng).
> - Xuất kho vẫn được **tạo tự động** khi nhân viên kho duyệt yêu cầu cấp phát — không cần form thủ công.
> - Thêm nút **"Xuất file Excel"** (export ra) ở trang lịch sử xuất kho để tải danh sách về máy.
> - **KHÔNG** thêm tính năng upload Excel vào trang xuất kho vì không có nghiệp vụ nào yêu cầu điều này.

### 2.7 — Thêm routes cho phiếu trả thiết bị
```
POST /returns/create          — TK tạo phiếu trả
GET  /returns                 — NV_KHO xem danh sách
PUT  /returns/:id/confirm     — NV_KHO chấp nhận/từ chối
GET  /returns/my              — TK xem phiếu trả của mình
```

### 2.8 — Thêm routes cho gia hạn
```
POST /allocations/:id/extend-request   — TK gửi yêu cầu gia hạn (body: { ngay_gia_han, ly_do })
PUT  /allocations/:id/extend-approve   — NV_KHO chấp nhận/từ chối gia hạn
```

---

## PHẦN 3 — THAY ĐỔI FRONTEND (client/src/)

### 3.1 — Xóa role NV_BV khỏi toàn bộ frontend
Tìm và thay thế trong toàn bộ thư mục `client/src/`:
- Mọi điều kiện `role === 'NV_BV'` → `role === 'TRUONG_KHOA'`
- Mọi menu item, route guard, sidebar link liên quan đến NV_BV
- Xóa khỏi dropdown chọn vai trò trong trang tạo người dùng

### 3.2 — Xóa module "Yêu cầu nhập mới"
- Xóa page component liên quan
- Xóa route trong `App.tsx` hoặc router config
- Xóa menu item trong sidebar

### 3.3 — Trang Thiết bị: thêm phân loại và bộ lọc

**Thêm vào trang danh mục thiết bị:**
- Tab hoặc dropdown lọc: Tất cả / Vật tư tiêu hao / Tái sử dụng
- Bộ lọc sắp xếp: Tồn kho thấp→cao / cao→thấp / Mới nhất / Cũ nhất
- Badge hiển thị loại thiết bị trên mỗi card/row
- Highlight màu đỏ (hoặc badge cảnh báo) khi tồn kho < `nguong_canh_bao`

**Khi thêm/sửa thiết bị:**
- Thêm field bắt buộc: Loại (VAT_TU_TIEU_HAO / TAI_SU_DUNG)
- Thêm field: Đơn vị tính, Hệ số quy đổi, Ngưỡng cảnh báo
- Thêm field: Serial Number (chỉ hiện khi loại = TAI_SU_DUNG)

### 3.4 — Trang Nhà cung cấp
- Ẩn nút "Thêm NCC", "Sửa", "Xóa" với mọi role trừ ADMIN
- ADMIN vẫn giữ đủ CRUD (cần thiết để quản lý NCC cho Excel nhập kho)

### 3.5 — Trang Nhập kho: thay form thủ công bằng Upload Excel

**Giao diện mới:**
```
[ Upload file Excel ] → Xem bảng preview → [ Xác nhận nhập kho ]
```

**Chi tiết:**
1. Nút upload → chọn file .xlsx từ máy
2. Gọi `POST /imports/from-excel` → nhận về JSON preview
3. Hiển thị bảng preview với toàn bộ rows, highlight row lỗi màu đỏ (sai format, thiếu field, mã thiết bị không tìm thấy)
4. User xem lại, sửa lỗi nếu cần (hoặc bỏ qua row lỗi)
5. Nút "Xác nhận nhập kho" → `POST /imports/confirm`
6. Thêm nút "Tải template Excel" để người dùng tải file mẫu đúng format

### 3.6 — Trang Xuất kho
- Xóa nút "Lập phiếu xuất" thủ công
- Xuất kho vẫn hiển thị lịch sử đầy đủ (do hệ thống tự tạo khi duyệt cấp phát)
- Thêm nút **"Xuất file Excel"** ở góc trên phải để export danh sách xuất kho

### 3.7 — Trang Khoa
- Thêm bảng liệt kê thiết bị đang được mượn theo từng khoa
- Cột hiển thị: Tên thiết bị, Số lượng, Ngày mượn, Hạn trả, Trạng thái (Đang mượn / Sắp đến hạn / Quá hạn)
- Highlight đỏ các row sắp đến hạn (còn ≤ 2 ngày)
- Thêm nút **"Xuất Excel"** để tải danh sách

### 3.8 — Trang Yêu cầu cấp phát

#### Với TRUONG_KHOA:
**Giao diện giỏ hàng:**
1. Phần trái/trên: Danh sách tất cả thiết bị trong kho (có ảnh, tên, số lượng còn lại, loại)
   - Ô tìm kiếm theo tên/mã
   - Nút "Thêm vào giỏ" mỗi card
2. Icon giỏ hàng (cart) ở góc trên phải, hiện badge số lượng item đã chọn
3. Click icon giỏ → panel/drawer hiện ra:
   - Danh sách thiết bị đã chọn
   - Mỗi item: số lượng (input), đơn vị tính (readonly), hạn mượn (datepicker — **chỉ hiện với TAI_SU_DUNG**)
   - Validate: TAI_SU_DUNG bắt buộc có hạn mượn, VAT_TU_TIEU_HAO không cần
   - Nút "Tạo yêu cầu cấp phát" ở cuối panel
4. Mục "Yêu cầu của tôi": danh sách yêu cầu đã gửi kèm trạng thái

#### Với NV_KHO:
- Danh sách tất cả yêu cầu cấp phát từ các trưởng khoa (mới nhất trước)
- Click vào yêu cầu → xem chi tiết: danh sách thiết bị, số lượng, đơn vị, **hạn mượn trả**
- Nút Chấp nhận / Từ chối kèm ô nhập lý do khi từ chối
- Khi Chấp nhận → hệ thống tự động:
  - Tạo bản ghi xuất kho
  - Cập nhật tồn kho
  - Gửi thông báo cho TK kèm QR code

#### Với ADMIN:
- Giao diện giống NV_KHO nhưng **ẩn nút Chấp nhận/Từ chối** (chỉ xem)

### 3.9 — Trang Trưởng khoa: Quản lý thiết bị đang mượn

**Thay thế "Quản lý kho" bằng "Thiết bị của khoa tôi":**

Hiển thị bảng thiết bị đang mượn:
| Tên thiết bị | SL | Đơn vị | Ngày mượn | Hạn trả | Trạng thái | Hành động |
|---|---|---|---|---|---|---|

**Gia hạn:**
- Mỗi row có datepicker ẩn để thay đổi ngày hạn trả
- Khi thay đổi ngày → nút "Gia hạn" của row đó chuyển sang màu nổi bật (không dùng animation nhấp nháy — dùng background accent color + border)
- Click "Gia hạn" → modal nhỏ nhập lý do → gửi `POST /allocations/:id/extend-request`
- Sau khi gửi, trạng thái row chuyển thành "Chờ duyệt gia hạn"

**Trả thiết bị:**
- Khi còn ≤ 2 ngày đến hạn trả → icon cảnh báo (tam giác vàng ⚠) hiện bên cạnh row
- Checkbox chọn thiết bị muốn trả (có thể chọn nhiều)
- Nút "Trả thiết bị" ở cuối bảng → tạo phiếu trả → hiện QR code
- QR code encode JSON:
```json
{
  "ma_phieu_tra": "TRA-2026-001",
  "truong_khoa": "BS. Nguyễn Văn A",
  "khoa": "Khoa Ngoại",
  "ngay_tao": "2026-04-13T10:00:00Z",
  "danh_sach": [
    {"ten_thiet_bi": "Máy đo SpO2", "so_luong": 2, "serial": "SN001"},
    {"ten_thiet_bi": "Máy đo huyết áp", "so_luong": 1, "serial": "SN002"}
  ]
}
```
> Dùng thư viện `qrcode` (npm) để generate QR trên client, không cần backend.

### 3.10 — Báo cáo thống kê cho Trưởng khoa
- Chỉ hiển thị: Thiết bị đang mượn / Thiết bị đã trả / Lịch sử yêu cầu cấp phát của khoa
- Xóa các widget báo cáo toàn hệ thống (tổng nhập kho, tổng xuất kho toàn viện)

### 3.11 — Trang Trả thiết bị (mới)

Với TRUONG_KHOA:
- Hiển thị danh sách phiếu trả đã tạo kèm trạng thái (Chờ xác nhận / Đã trả / Bị từ chối)
- Click vào phiếu → xem chi tiết + QR code của phiếu đó

Với NV_KHO:
- Hiển thị thông báo "Yêu cầu trả hàng" từ các TK
- Click vào → xem chi tiết: danh sách thiết bị trả, tình trạng từng cái
- Nút Chấp nhận / Từ chối
- Khi Chấp nhận → cập nhật tồn kho (cộng lại) → gửi thông báo TK

### 3.12 — Hệ thống thông báo: thêm click xem chi tiết + QR

**Nâng cấp component Thông báo:**
1. Mỗi thông báo khi click → mở modal/panel chi tiết
2. Với thông báo loại "Cấp phát được duyệt":
   - Hiển thị danh sách thiết bị được phép mượn
   - Hiển thị QR code (generate từ data của yêu cầu cấp phát)
3. Với thông báo loại "Gia hạn được duyệt/từ chối": hiển thị trạng thái mới
4. Với thông báo loại "Yêu cầu trả hàng": hiển thị danh sách + trạng thái

---

## PHẦN 4 — DỮ LIỆU THIẾT BỊ VÀ FILE EXCEL NHẬP KHO

### Quy tắc quan trọng về cách nạp dữ liệu ban đầu

> **KHÔNG** seed dữ liệu thiết bị trực tiếp vào DB qua file SQL hay script.  
> Toàn bộ dữ liệu thiết bị phải được nạp vào hệ thống **thông qua 3 file Excel nhập kho** bên dưới, giống như quy trình thực tế.  
> Người dùng sẽ upload từng file lên trang Nhập kho để tạo dữ liệu.

### Nâng cấp bắt buộc cho logic parse Excel (UPSERT)

Vì kho ban đầu rỗng, cần thay đổi logic parse Excel từ **validate-only** sang **upsert**:

```
Khi parse một row trong Excel nhập kho:
  IF ma_thiet_bi chưa tồn tại trong bảng thiet_bi:
    → Tạo mới record trong thiet_bi (INSERT)
    → Tạo mới record trong ton_kho với so_luong = so_luong_nhap
  ELSE:
    → Cộng thêm so_luong vào ton_kho hiện có (UPDATE)
  → Tạo record trong phieu_nhap_kho và chi_tiet_nhap_kho
```

Điều này cho phép file Excel vừa tạo danh mục thiết bị vừa nhập tồn kho trong một lần.

### Về hình ảnh trong Excel

**KHÔNG nhúng ảnh trực tiếp vào cell Excel** — file sẽ nặng hàng chục MB và thư viện `xlsx` không parse được.  
Thay vào đó: cột `url_anh` chứa **URL ảnh từ internet** (Wikipedia, Wikimedia Commons — miễn phí, ổn định).  
Khi parse Excel, backend fetch URL đó và lưu vào DB dưới dạng URL (không download về server).

---

### File Excel 1: `nhap_kho_thiet_bi_tai_su_dung.xlsx`
Nhập kho thiết bị y tế tái sử dụng — 10 thiết bị, 2 nhà cung cấp.

**Cột:** `ma_thiet_bi` | `ten_thiet_bi` | `loai` | `so_luong` | `don_vi_tinh` | `he_so_quy_doi` | `don_gia` | `so_lo` | `han_su_dung` | `serial_number` | `ma_ncc` | `nguong_canh_bao` | `url_anh` | `ghi_chu`

| ma_thiet_bi | ten_thiet_bi | loai | so_luong | don_vi_tinh | he_so_quy_doi | don_gia | so_lo | han_su_dung | serial_number | ma_ncc | nguong_canh_bao | url_anh | ghi_chu |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TB-001 | Máy thở (Ventilator) | TAI_SU_DUNG | 4 | Cái | 1 | 320000000 | | | SN-VEN-001 | NCC-001 | 1 | https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Puritan_bennett_ventilator.jpg/320px-Puritan_bennett_ventilator.jpg | Kho ICU và HSTC |
| TB-002 | Máy theo dõi bệnh nhân (Patient Monitor) | TAI_SU_DUNG | 8 | Cái | 1 | 85000000 | | | SN-MON-001 | NCC-001 | 2 | https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Vital_signs_monitor.jpg/320px-Vital_signs_monitor.jpg | Gắn đầu giường ICU |
| TB-003 | Máy siêu âm | TAI_SU_DUNG | 2 | Cái | 1 | 450000000 | | | SN-USG-001 | NCC-001 | 1 | https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Ultrasound_machine.jpg/320px-Ultrasound_machine.jpg | Di động, dùng chung các khoa |
| TB-004 | Máy điện tâm đồ (ECG) | TAI_SU_DUNG | 3 | Cái | 1 | 42000000 | | | SN-ECG-001 | NCC-001 | 1 | https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/12leadECG.jpg/320px-12leadECG.jpg | Khoa Tim mạch và Cấp cứu |
| TB-005 | Máy phá rung tim (Defibrillator / AED) | TAI_SU_DUNG | 5 | Cái | 1 | 95000000 | | | SN-AED-001 | NCC-001 | 2 | https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Defibtech_Lifeline_AED.jpg/320px-Defibtech_Lifeline_AED.jpg | Cấp cứu và hành lang |
| TB-006 | Máy bơm tiêm (Syringe pump) | TAI_SU_DUNG | 10 | Cái | 1 | 18000000 | | | SN-SYR-001 | NCC-001 | 3 | https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Syringe_pump.jpg/320px-Syringe_pump.jpg | ICU và Phẫu thuật |
| TB-007 | Giường bệnh điện (Electric hospital bed) | TAI_SU_DUNG | 6 | Cái | 1 | 35000000 | | | SN-BED-001 | NCC-002 | 2 | https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Stryker_hospital_bed.jpg/320px-Stryker_hospital_bed.jpg | Phòng bệnh thường |
| TB-008 | Xe lăn | TAI_SU_DUNG | 8 | Cái | 1 | 3200000 | | | SN-WCH-001 | NCC-002 | 3 | https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Wheelchair_accessible_building.jpg/320px-Wheelchair_accessible_building.jpg | Dùng chung toàn viện |
| TB-009 | Xe đẩy cáng cứu | TAI_SU_DUNG | 4 | Cái | 1 | 8500000 | | | SN-STR-001 | NCC-002 | 1 | https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Stretcher_trolley.jpg/320px-Stretcher_trolley.jpg | Cấp cứu và hành lang |
| TB-010 | Máy ly tâm (Centrifuge) | TAI_SU_DUNG | 2 | Cái | 1 | 28000000 | | | SN-CTF-001 | NCC-001 | 1 | https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Microcentrifuge.jpg/320px-Microcentrifuge.jpg | Phòng xét nghiệm |

**Dữ liệu nhà cung cấp cần tạo trước trong DB (Admin tạo qua UI):**
- `NCC-001` — Công ty TNHH Thiết bị Y tế Phương Nam — SĐT: 0283-999-1111 — Email: phuongnam@medtech.vn
- `NCC-002` — Công ty CP Vật tư Bệnh viện Việt — SĐT: 0244-888-2222 — Email: vietmedical@supply.vn

---

### File Excel 2: `nhap_kho_vat_tu_tieu_hao.xlsx`
Nhập kho vật tư tiêu hao — 12 loại, 3 nhà cung cấp, đầy đủ số lô và hạn sử dụng.

**Cột:** `ma_thiet_bi` | `ten_thiet_bi` | `loai` | `so_luong` | `don_vi_tinh` | `he_so_quy_doi` | `don_gia` | `so_lo` | `han_su_dung` | `serial_number` | `ma_ncc` | `nguong_canh_bao` | `url_anh` | `ghi_chu`

| ma_thiet_bi | ten_thiet_bi | loai | so_luong | don_vi_tinh | he_so_quy_doi | don_gia | so_lo | han_su_dung | serial_number | ma_ncc | nguong_canh_bao | url_anh | ghi_chu |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| VT-001 | Kim tiêm 5ml | VAT_TU_TIEU_HAO | 20 | Thùng | 1000 | 120000 | LOT-26-KT-001 | 31/12/2028 | | NCC-003 | 5 | https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Hypodermic_needle.jpg/320px-Hypodermic_needle.jpg | 1 thùng = 10 hộp x 100 cái |
| VT-002 | Bơm tiêm nhựa 10ml | VAT_TU_TIEU_HAO | 15 | Thùng | 500 | 95000 | LOT-26-BT-001 | 30/06/2028 | | NCC-003 | 5 | https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Disposable_syringe.jpg/320px-Disposable_syringe.jpg | 1 thùng = 5 hộp x 100 cái |
| VT-003 | Găng tay vô khuẩn size M | VAT_TU_TIEU_HAO | 30 | Thùng | 500 | 850000 | LOT-26-GT-001 | 31/12/2027 | | NCC-003 | 10 | https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Sterile_gloves.jpg/320px-Sterile_gloves.jpg | 1 thùng = 10 hộp x 50 đôi |
| VT-004 | Khẩu trang y tế 3 lớp | VAT_TU_TIEU_HAO | 50 | Thùng | 1000 | 45000 | LOT-26-KT2-001 | 01/01/2029 | | NCC-003 | 10 | https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Surgical_mask.jpg/320px-Surgical_mask.jpg | 1 thùng = 20 hộp x 50 cái |
| VT-005 | Gạc vô khuẩn 10x10cm | VAT_TU_TIEU_HAO | 20 | Thùng | 1000 | 75000 | LOT-26-GV-001 | 15/09/2028 | | NCC-004 | 5 | https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Sterile_gauze_pad.jpg/320px-Sterile_gauze_pad.jpg | 1 thùng = 100 túi x 10 miếng |
| VT-006 | Băng y tế cuộn 5cm | VAT_TU_TIEU_HAO | 10 | Thùng | 120 | 85000 | LOT-26-BYT-001 | 30/06/2028 | | NCC-004 | 3 | https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Medical_bandage.jpg/320px-Medical_bandage.jpg | 1 thùng = 10 hộp x 12 cuộn |
| VT-007 | Dịch truyền NaCl 0.9% 500ml | VAT_TU_TIEU_HAO | 100 | Thùng | 12 | 85000 | LOT-26-DT-001 | 31/03/2028 | | NCC-004 | 20 | https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Saline_solution_bag.jpg/320px-Saline_solution_bag.jpg | 1 thùng = 12 chai |
| VT-008 | Dây truyền dịch 1 đầu | VAT_TU_TIEU_HAO | 25 | Thùng | 200 | 55000 | LOT-26-DTD-001 | 30/09/2028 | | NCC-004 | 5 | https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/IV_tubing.jpg/320px-IV_tubing.jpg | 1 thùng = 10 hộp x 20 bộ |
| VT-009 | Ống thông tiểu Foley 16Fr | VAT_TU_TIEU_HAO | 10 | Hộp | 10 | 180000 | LOT-26-OT-001 | 31/12/2028 | | NCC-003 | 3 | https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Foley_catheter.jpg/320px-Foley_catheter.jpg | 1 hộp = 10 cái |
| VT-010 | Chỉ khâu phẫu thuật Vicryl 2-0 | VAT_TU_TIEU_HAO | 20 | Hộp | 36 | 450000 | LOT-26-CK-001 | 30/06/2029 | | NCC-003 | 5 | https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Suture_material.jpg/320px-Suture_material.jpg | 1 hộp = 36 cuộn |
| VT-011 | Test nhanh COVID-19 | VAT_TU_TIEU_HAO | 40 | Hộp | 25 | 380000 | LOT-26-TNK-001 | 31/12/2026 | | NCC-004 | 10 | https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Rapid_antigen_test.jpg/320px-Rapid_antigen_test.jpg | 1 hộp = 25 test, HSD ngắn |
| VT-012 | Dung dịch sát khuẩn tay nhanh 500ml | VAT_TU_TIEU_HAO | 30 | Thùng | 12 | 95000 | LOT-26-SK-001 | 30/09/2028 | | NCC-004 | 5 | https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Hand_sanitizer.jpg/320px-Hand_sanitizer.jpg | 1 thùng = 12 chai |

**Nhà cung cấp bổ sung (Admin tạo thêm trước khi upload file này):**
- `NCC-003` — Công ty TNHH Vật tư Tiêu hao Y tế Miền Nam — SĐT: 0283-777-3333 — Email: miennam@consumables.vn
- `NCC-004` — Công ty CP Dược phẩm và Vật tư Đà Nẵng — SĐT: 0236-666-4444 — Email: danangpharma@med.vn

---

### File Excel 3: `nhap_kho_vung_xam.xlsx`
Nhập kho thiết bị vùng xám (tái sử dụng sau tiệt khuẩn) — 6 loại.

| ma_thiet_bi | ten_thiet_bi | loai | so_luong | don_vi_tinh | he_so_quy_doi | don_gia | so_lo | han_su_dung | serial_number | ma_ncc | nguong_canh_bao | url_anh | ghi_chu |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| VX-001 | Kẹp phẫu thuật (Forceps) | TAI_SU_DUNG | 20 | Cái | 1 | 850000 | | | SN-FCP-001 | NCC-001 | 5 | https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Surgical_forceps.jpg/320px-Surgical_forceps.jpg | Hấp tiệt khuẩn sau mỗi ca mổ |
| VX-002 | Kẹp bấm Kelly | TAI_SU_DUNG | 15 | Cái | 1 | 650000 | | | SN-KLY-001 | NCC-001 | 5 | https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Kelly_clamp.jpg/320px-Kelly_clamp.jpg | Tiệt khuẩn bằng autoclave |
| VX-003 | Ống nội soi (Endoscope) | TAI_SU_DUNG | 2 | Cái | 1 | 280000000 | | | SN-END-001 | NCC-001 | 1 | https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Endoscope.jpg/320px-Endoscope.jpg | Khử khuẩn hóa học sau mỗi thủ thuật |
| VX-004 | Dao mổ thép tay cầm | TAI_SU_DUNG | 12 | Cái | 1 | 320000 | | | SN-SCP-001 | NCC-001 | 3 | https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Scalpel_handles.jpg/320px-Scalpel_handles.jpg | Thay lưỡi dao dùng 1 lần, tay cầm tái sử dụng |
| VX-005 | Mask thở oxy (Oxygen mask) | TAI_SU_DUNG | 10 | Cái | 1 | 180000 | | | SN-OMK-001 | NCC-002 | 3 | https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Oxygen_mask.jpg/320px-Oxygen_mask.jpg | Tiệt khuẩn giữa các bệnh nhân |
| VX-006 | Bình oxy vỏ (loại 40L) | TAI_SU_DUNG | 6 | Bình | 1 | 2800000 | | | SN-OXY-001 | NCC-002 | 2 | https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Oxygen_cylinder.jpg/320px-Oxygen_cylinder.jpg | Vỏ bình tái sử dụng, oxy bên trong là vật tư tiêu hao |

---

### File Excel mẫu để export (không upload)

File `template_xuat_kho_export.xlsx` — tạo bằng code khi user nhấn "Xuất Excel" từ trang lịch sử xuất kho.  
Format cột output: `Mã phiếu xuất` | `Ngày xuất` | `Khoa nhận` | `Tên thiết bị` | `Số lượng` | `Đơn vị` | `Mục đích` | `Người lập` | `Trạng thái`

---

### Thứ tự upload dữ liệu ban đầu (hướng dẫn người dùng)

```
Bước 1: Admin tạo 4 nhà cung cấp (NCC-001 đến NCC-004) qua giao diện web
Bước 2: Upload file nhap_kho_thiet_bi_tai_su_dung.xlsx → xem preview → Xác nhận nhập
Bước 3: Upload file nhap_kho_vat_tu_tieu_hao.xlsx → xem preview → Xác nhận nhập
Bước 4: Upload file nhap_kho_vung_xam.xlsx → xem preview → Xác nhận nhập
Kết quả: Hệ thống có 28 loại thiết bị/vật tư với đầy đủ ảnh, đơn vị, tồn kho ban đầu
```

---

## PHẦN 5 — CÁC RÀNG BUỘC QUAN TRỌNG KHÔNG ĐƯỢC BỎ QUA

### 5.1 — Logic nghiệp vụ vật tư tiêu hao
- Khi xuất kho (cấp phát) vật tư tiêu hao → trừ tồn kho ngay lập tức (không hoàn lại)
- Chỉ cho phép trả lại nếu: tình trạng = `NGUYEN_SEAL` VÀ có ảnh đính kèm
- **Hệ thống KHÔNG tự cộng tồn kho khi TK upload ảnh** — phải chờ NV_KHO xác nhận nhận hàng thực tế rồi mới cộng

### 5.2 — Logic QR code
Có 2 loại QR khác nhau, không được nhầm lẫn:
- **QR cấp phát** (điểm 13): Sinh khi NV_KHO duyệt yêu cầu cấp phát → gắn vào thông báo → TK dùng để nhận hàng
- **QR trả hàng** (điểm 11): Sinh khi TK tạo phiếu trả → TK xuất cho NV_KHO quét khi nhận hàng trả về

Cả hai đều generate bằng thư viện `qrcode` phía client, encode JSON đủ thông tin để xem offline.

### 5.3 — Ngưỡng cảnh báo tồn kho
- Không hardcode `< 10` trong code
- Đọc từ field `nguong_canh_bao` của từng thiết bị trong DB
- Mỗi thiết bị có thể có ngưỡng khác nhau

### 5.4 — Gia hạn
- Nút gia hạn chỉ hiện với thiết bị loại `TAI_SU_DUNG`
- Vật tư tiêu hao không có hạn mượn, không có gia hạn
- Khi TK gửi yêu cầu gia hạn, trạng thái là "Chờ duyệt", không tự cập nhật ngày ngay

### 5.5 — Nhà cung cấp
- Khi parse Excel nhập kho, nếu `ma_ncc` không tìm thấy trong DB → trả về lỗi validation cho row đó, KHÔNG tự tạo NCC mới
- Admin phải tạo NCC trước qua giao diện web, SAU ĐÓ mới upload Excel nhập kho
- Admin vẫn giữ quyền CRUD đầy đủ với NCC

### 5.6 — Upsert khi parse Excel (bắt buộc cho dữ liệu ban đầu)
- Khi `ma_thiet_bi` trong Excel chưa tồn tại trong DB → tạo mới record `thiet_bi` + record `ton_kho`
- Khi `ma_thiet_bi` đã tồn tại → chỉ cộng thêm số lượng vào `ton_kho`
- Luôn tạo record `phieu_nhap_kho` và `chi_tiet_nhap_kho` bất kể trường hợp nào
- Trường `url_anh` trong Excel là URL ảnh từ internet, lưu thẳng vào DB dưới dạng VARCHAR, không download về server

### 5.7 — Encoding tiếng Việt trong Excel
- Khi tạo file Excel bằng thư viện `xlsx`, set encoding UTF-8 để tiếng Việt có dấu hiển thị đúng
- Khi parse file Excel upload, đọc bằng `xlsx.read(buffer, { type: 'buffer', codepage: 65001 })`
- Validate: tên thiết bị không được để trống, không được chứa ký tự đặc biệt ngoài dấu tiếng Việt

---

## PHẦN 6 — THỨ TỰ THỰC HIỆN

```
1. PHẦN 0 — Dọn thư viện, kiểm tra node_modules
2. PHẦN 1 — DB migration (làm trước, làm một lần)
3. PHẦN 2.1, 2.2 — Xóa NV_BV và module nhập mới khỏi backend
4. PHẦN 3.1 — Xóa NV_BV khỏi frontend
5. PHẦN 3.3 — Thêm phân loại thiết bị (cả backend route + frontend)
6. PHẦN 2.3, 2.4 — Cập nhật route equipment và inventory
7. PHẦN 4 — Tạo file Excel test (làm song song với bước 8)
8. PHẦN 2.5 + 3.5 — Tính năng upload Excel nhập kho
9. PHẦN 3.4 — Nhà cung cấp: ẩn CRUD với non-admin
10. PHẦN 3.6 — Xuất kho: xóa form thủ công, thêm export Excel
11. PHẦN 3.7 + 3.8 — Trang Khoa + Yêu cầu cấp phát (giỏ hàng)
12. PHẦN 2.7, 2.8 + 3.9, 3.10, 3.11 — Trả thiết bị + Gia hạn
13. PHẦN 3.12 — Nâng cấp thông báo + QR
```

---

*File này được tạo ngày 13/04/2026. Mọi thay đổi ngoài danh sách này cần confirm trước khi implement.*
