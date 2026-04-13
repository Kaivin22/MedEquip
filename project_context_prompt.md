# PROJECT CONTEXT: MedEquip - Hệ thống Quản lý Thiết bị Y tế Bệnh viện

## 1. Tổng quan Dự án (Project Overview)
- **Tên dự án**: MedEquip (Quản lý Thiết bị Y tế)
- **Mục tiêu**: Quản lý vòng đời thiết bị y tế trong bệnh viện, từ nhập kho, cấp phát, sử dụng, báo hỏng đến thanh lý.
- **Ngôn ngữ**: Tiếng Việt (Giao diện và Dữ liệu).
- **Chế độ hoạt động (Dual Engine)**:
    - **API Mode**: Kết nối backend Node.js + MySQL.
    - **Mock Mode**: Chạy offline với LocalStorage (dành cho demo nhanh).

## 2. Công nghệ (Tech Stack)
### Frontend (Trong thư mục `client/`)
- **Framework**: React 18 + Vite (TypeScript).
- **Styling**: Tailwind CSS + Shadcn UI (Radix UI components).
- **Icons**: Lucide React.
- **Charts**: Recharts.
- **State Management**: React Query (TanStack Query) cho API, và 1 hệ thống Store tự định nghĩa trong `client/src/lib/store.ts`.
- **Form Handling**: React Hook Form + Zod (Validation).
- **Animations**: Framer Motion.
- **Utility**: `xlsx` (đọc/xuất Excel), `date-fns` (xử lý thời gian).

### Backend (Trong thư mục `server/`)
- **Runtime**: Node.js (ES Modules).
- **Framework**: Express.js.
- **Database**: MySQL 8.0 (Sử dụng thư viện `mysql2` với kết nối Pool).
- **Authentication**: JWT (JSON Web Token) & bcryptjs (mã hóa mật khẩu).
- **Middleware**: `auth.js` để kiểm tra quyền truy cập theo vai trò.

## 3. Cấu trúc Cơ sở dữ liệu (Database Schema)
Hệ thống sử dụng database `medequip_db` với các bảng chính:
- `nguoi_dung`: Lưu thông tin nhân viên, vai trò, trạng thái.
- `thiet_bi`: Danh mục thiết bị, hình ảnh, mã nhà cung cấp.
- `nha_cung_cap`: Thông tin các đơn vị cung cấp thiết bị.
- `khoa`: Danh sách các khoa phòng trong bệnh viện.
- `ton_kho`: Theo dõi số lượng thực tế trong kho (số lượng sẵn có, đang dùng, đã hỏng).
- `phieu_yeu_cau`: Phiếu yêu cầu cấp phát thiết bị từ khoa.
- `phieu_cap_phat` & `chi_tiet_cap_phat`: Xử lý việc xuất kho cấp cho khoa.
- `phieu_nhap_kho` & `chi_tiet_nhap_kho`: Quản lý nhập hàng mới.
- `phieu_xuat_kho` & `chi_tiet_xuat_kho`: Quản lý xuất kho (khác cấp phát, ví dụ thanh lý).
- `phieu_bao_hu_hong`: Ghi nhận sự cố thiết bị tại khoa.
- `thong_bao`: Hệ thống thông báo nội bộ cho các vai trò.
- `phieu_yeu_cau_nhap`: (US-018) Đề xuất mua sắm/nhập thiết bị mới chưa có trong danh mục.

## 4. Vai trò và Phân quyền (RBAC)
Hệ thống có 4 vai trò chính:
1. **ADMIN**: Quản trị hệ thống, quản lý người dùng, thiết lập danh mục khoa/nhà cung cấp.
2. **NV_KHO (Nhân viên Kho)**: Quản lý thiết bị, tồn kho, thực hiện nhập/xuất kho, xử lý cấp phát sau khi được duyệt.
3. **TRUONG_KHOA (Trưởng khoa)**: Duyệt các phiếu yêu cầu cấp phát hoặc yêu cầu nhập thiết bị từ nhân viên trong khoa.
4. **NV_BV (Nhân viên Bệnh viện)**: Tạo yêu cầu cấp phát thiết bị, báo hỏng thiết bị đang sử dụng.

## 5. Các quy trình nghiệp vụ chính (Key Workflows)
### Quy trình Cấp phát thiết bị:
1. `NV_BV` tạo `phieu_yeu_cau`.
2. `TRUONG_KHOA` duyệt phiếu (Trạng thái: `CHO_DUYET` -> `DA_DUYET`).
3. `NV_KHO` thực hiện cấp phát (Trạng thái: `DA_DUYET` -> `DA_CAP_PHAT`), cập nhật `ton_kho`.

### Quy trình Nhập thiết bị mới (US-018/US-019):
1. `NV_KHO` hoặc `TRUONG_KHOA` tạo đề xuất nhập (`phieu_yeu_cau_nhap`).
2. `ADMIN` hoặc Cấp trên duyệt đề xuất.
3. Thực hiện nhập kho thực tế qua `phieu_nhap_kho`.

## 6. Tương tác Dữ liệu (Data Interaction)
- **Backend -> Database**: Sử dụng `mysql2/promise` để thực thi các câu lệnh SQL thuần (Raw SQL). Không sử dụng ORM (như Sequelize hay Prisma) để tối ưu hiệu năng và kiểm soát query.
- **Frontend -> Backend**: Sử dụng `fetch` API gói gọn trong hàm `fetchApi` (`client/src/services/api.ts`).
- **Data Synchronization**: Khi ở API mode, hệ thống sử dụng `client/src/services/apiSync.ts` để đồng bộ dữ liệu về Store cục bộ sau khi nhận kết quả từ Server.

## 7. Cấu trúc API (API Endpoints)
Các route chính bao gồm:
- `/auth`: Đăng nhập, đăng xuất, đổi mật khẩu.
- `/users`: Quản lý người dùng (CRUD).
- `/equipment`: Danh mục thiết bị.
- `/inventory`: Tình trạng tồn kho thực tế.
- `/requests`: Phiếu yêu cầu cấp phát.
- `/import-requests`: (US-018) Đề xuất nhập hàng.
- `/imports` & `/exports`: Phiếu nhập/xuất kho.
- `/damage-reports`: Báo cáo hư hỏng.
- `/notifications`: Hệ thống thông báo.

## 8. Quy ước Coding (Project Standards)
- **API Response**: Luôn trả về format `{ success: boolean, message?: string, data?: any }` hoặc mảng object trực tiếp. Các lỗi máy chủ trả về status 500.
- **Frontend naming**: Sử dụng camelCase cho biến, PascalCase cho Components.
- **Database naming**: Sử dụng snake_case (`ma_thiet_bi`, `ho_ten`).
- **Date format**: Lưu trữ ISO String ở Frontend và DATETIME ở MySQL.

## 9. Trạng thái hiện tại (Recent Changes)
- Đã hoàn thành việc chuyển đổi toàn bộ logic từ LocalStorage sang SQL Backend (Sprint 1).
- Đã thêm cột `so_luong_hu` vào bảng `phieu_bao_hu_hong` và `trang_thai` vào `phieu_xuat_kho`.
- Hệ thống đã xử lý tốt Tiếng Việt có dấu và lưu trữ hình ảnh thiết bị dưới dạng Base64 (LONGTEXT) hoặc URL.

---
**Claude, hãy sử dụng ngữ cảnh này để hỗ trợ tôi phát triển tiếp các tính năng hoặc sửa lỗi cho dự án MedEquip.**
