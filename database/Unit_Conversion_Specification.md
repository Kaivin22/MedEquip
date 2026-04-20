# Tài liệu Đặc tả: Quản lý Đơn vị tính & Hệ quy đổi (MedEquip v4)

Tài liệu này hướng dẫn cách triển khai tính năng quy đổi đơn vị (Ví dụ: Nhập theo **Hộp**, Cấp phát theo **Cái**) để đảm bảo tồn kho luôn chính xác.

---

## 1. Thay đổi Cấu trúc Database (SQL)

### 1.1. Bảng `thiet_bi` (Thiết bị)
Cần bổ sung các trường sau để định nghĩa quy tắc quy đổi:
- `don_vi_co_so` (VARCHAR 20): Đơn vị nhỏ nhất (Ví dụ: "Cái", "Viên"). Đây là đơn vị dùng để tính tồn kho.
- `don_vi_nhap` (VARCHAR 20): Đơn vị khi mua/nhập kho (Ví dụ: "Hộp", "Thùng").
- `he_so_quy_doi` (INT): Số lượng đơn vị cơ sở chứa trong một đơn vị nhập. (Ví dụ: 1 Hộp = 50 Cái -> Hệ số = 50).

### 1.2. Bảng `chi_tiet_nhap_kho`
Cần lưu lại đơn vị lúc nhập để truy xuất lịch sử:
- `don_vi_giao_dich` (VARCHAR 20): Lưu đơn vị lúc nhập (Hộp/Thùng).
- `so_luong_giao_dich` (INT): Số lượng nhập theo đơn vị giao dịch.
- `so_luong_co_so` (INT): Số lượng đã quy đổi (Transaction Qty * Factor). **Trường này dùng để cộng vào tồn kho.**

---

## 2. Logic xử lý (Backend)

### Nguyên tắc vàng:
> **Tồn kho (`ton_kho`) LUÔN LUÔN lưu trữ theo Đơn vị cơ sở.**

### 2.1. Nghiệp vụ Nhập kho:
- **Input**: Người dùng nhập 10 Hộp (Hệ số quy đổi của thiết bị này là 50).
- **Xử lý**: 
    1. Lấy `he_so_quy_doi` từ bảng `thiet_bi`.
    2. Tính `tong_so_luong_co_so = 10 * 50 = 500`.
    3. Cộng `500` vào trường `so_luong_kho` trong bảng `ton_kho`.
- **Lưu lịch sử**: Lưu vào chi tiết nhập: `10 Hộp` và `500 Cái`.

### 2.2. Nghiệp vụ Cấp phát/Xuất kho:
- Thường thực hiện theo Đơn vị cơ sở (Cái).
- **Xử lý**: Trừ trực tiếp số lượng yêu cầu vào `ton_kho`. 
- *Nâng cao:* Nếu cho phép cấp phát theo Hộp, phải nhân hệ số trước khi trừ tồn kho.

### 2.3. Nghiệp vụ Trả thiết bị:
- Đơn vị trả phải khớp với đơn vị trong phiếu cấp phát (thường là Đơn vị cơ sở).

---

## 3. Yêu cầu Giao diện (Frontend)

### 3.1. Trang Quản lý thiết bị:
- Thêm 3 ô nhập: Đơn vị cơ sở, Đơn vị nhập, Hệ số quy đổi.
- Mặc định Hệ số = 1 (Nếu không có quy đổi).

### 3.2. Trang Nhập kho:
- Hiển thị nhãn Đơn vị nhập bên cạnh ô số lượng. 
- Hiển thị dòng chữ hỗ trợ: *"Tổng số lượng thực tế sẽ nhập: [Số lượng * Hệ số] [Đơn vị cơ sở]"*.

### 3.3. Trang Tồn kho (Dashboard):
- Hiển thị số lượng kèm đơn vị cơ sở để tránh hiểu lầm (Ví dụ: "Còn 500 Cái" thay vì chỉ hiện số 500).

---

## 4. Danh sách các File cần chỉnh sửa
1. `database/medequip_database.sql`: Cập nhật Schema.
2. `server/controllers/importController.js`: Sửa logic cộng tồn kho.
3. `server/controllers/equipmentController.js`: Sửa logic thêm/sửa thiết bị.
4. `client/src/pages/EquipmentPage.tsx`: Thêm input quy đổi.
5. `client/src/pages/ImportsPage.tsx`: Hiển thị đơn vị nhập và tính toán quy đổi.
