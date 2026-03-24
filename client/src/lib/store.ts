import { NguoiDung, ThietBi, TonKho, NhaCungCap, Khoa, ThongBao, PhieuYeuCauCapPhat, PhieuXuatKho, PhieuNhapKho, PhieuCapPhat, PhieuBaoHuHong } from '@/types';

const defaultUsers: NguoiDung[] = [
  { maNguoiDung: 'ND-001', hoTen: 'Nguyễn Văn Admin', email: 'admin@benhvien.vn', matKhau: '123456', vaiTro: 'ADMIN', trangThai: true, ngayTao: '2026-01-01', ngayCapNhat: '2026-01-01' },
  { maNguoiDung: 'ND-002', hoTen: 'Trần Thị Kho', email: 'kho@benhvien.vn', matKhau: '123456', vaiTro: 'NV_KHO', trangThai: true, ngayTao: '2026-01-01', ngayCapNhat: '2026-01-01' },
  { maNguoiDung: 'ND-003', hoTen: 'Lê Minh Khoa', email: 'truongkhoa@benhvien.vn', matKhau: '123456', vaiTro: 'TRUONG_KHOA', trangThai: true, ngayTao: '2026-01-01', ngayCapNhat: '2026-01-01' },
  { maNguoiDung: 'ND-004', hoTen: 'Phạm Thị BV', email: 'nvbv@benhvien.vn', matKhau: '123456', vaiTro: 'NV_BV', trangThai: true, ngayTao: '2026-01-01', ngayCapNhat: '2026-01-01' },
];

const defaultEquipment: ThietBi[] = [
  { maThietBi: 'TB-001', tenThietBi: 'Máy đo huyết áp', loaiThietBi: 'Máy móc', donViTinh: 'Cái', moTa: 'Máy đo huyết áp tự động', maNhaCungCap: 'NCC-001', trangThai: true, ngayTao: '2026-01-01', hinhAnh: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&h=300&fit=crop' },
  { maThietBi: 'TB-002', tenThietBi: 'Ống nghe y khoa', loaiThietBi: 'Dụng cụ', donViTinh: 'Cái', moTa: 'Ống nghe chuyên khoa nội', maNhaCungCap: 'NCC-001', trangThai: true, ngayTao: '2026-01-01', hinhAnh: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=400&h=300&fit=crop' },
  { maThietBi: 'TB-003', tenThietBi: 'Máy siêu âm', loaiThietBi: 'Máy móc', donViTinh: 'Bộ', moTa: 'Máy siêu âm 4D', maNhaCungCap: 'NCC-002', trangThai: true, ngayTao: '2026-01-01', hinhAnh: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=300&fit=crop' },
  { maThietBi: 'TB-004', tenThietBi: 'Kim tiêm', loaiThietBi: 'Vật tư', donViTinh: 'Hộp', moTa: 'Kim tiêm 5ml vô trùng', maNhaCungCap: 'NCC-003', trangThai: true, ngayTao: '2026-01-01', hinhAnh: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=300&fit=crop' },
  { maThietBi: 'TB-005', tenThietBi: 'Máy đo SpO2', loaiThietBi: 'Máy móc', donViTinh: 'Cái', moTa: 'Máy đo nồng độ oxy máu', maNhaCungCap: 'NCC-001', trangThai: true, ngayTao: '2026-01-01', hinhAnh: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=300&fit=crop' },
];

const defaultInventory: TonKho[] = [
  { maTonKho: 'TK-001', maThietBi: 'TB-001', soLuongKho: 50, soLuongHu: 2, soLuongDangDung: 30, ngayCapNhat: '2026-03-20' },
  { maTonKho: 'TK-002', maThietBi: 'TB-002', soLuongKho: 100, soLuongHu: 5, soLuongDangDung: 80, ngayCapNhat: '2026-03-20' },
  { maTonKho: 'TK-003', maThietBi: 'TB-003', soLuongKho: 10, soLuongHu: 0, soLuongDangDung: 8, ngayCapNhat: '2026-03-20' },
  { maTonKho: 'TK-004', maThietBi: 'TB-004', soLuongKho: 500, soLuongHu: 10, soLuongDangDung: 200, ngayCapNhat: '2026-03-20' },
  { maTonKho: 'TK-005', maThietBi: 'TB-005', soLuongKho: 30, soLuongHu: 1, soLuongDangDung: 20, ngayCapNhat: '2026-03-20' },
];

const defaultSuppliers: NhaCungCap[] = [
  { maNhaCungCap: 'NCC-001', tenNhaCungCap: 'Công ty TNHH Thiết bị Y tế Phương Nam', diaChi: '123 Nguyễn Văn Linh, Đà Nẵng', soDienThoai: '0236-123-456', email: 'phuongnam@ytevn.com', trangThai: true },
  { maNhaCungCap: 'NCC-002', tenNhaCungCap: 'Công ty CP Y khoa Miền Trung', diaChi: '456 Trần Phú, Huế', soDienThoai: '0234-789-012', email: 'mientrung@yk.com', trangThai: true },
  { maNhaCungCap: 'NCC-003', tenNhaCungCap: 'Tập đoàn Medico Việt Nam', diaChi: '789 Lê Lợi, TP.HCM', soDienThoai: '028-345-678', email: 'info@medico.vn', trangThai: true },
];

const defaultDepartments: Khoa[] = [
  { maKhoa: 'K-001', tenKhoa: 'Khoa Nội', moTa: 'Khoa Nội tổng hợp', trangThai: true },
  { maKhoa: 'K-002', tenKhoa: 'Khoa Ngoại', moTa: 'Khoa Ngoại tổng hợp', trangThai: true },
  { maKhoa: 'K-003', tenKhoa: 'Khoa Sản', moTa: 'Khoa Sản phụ khoa', trangThai: true },
  { maKhoa: 'K-004', tenKhoa: 'Khoa Nhi', moTa: 'Khoa Nhi đồng', trangThai: true },
  { maKhoa: 'K-005', tenKhoa: 'Khoa Cấp cứu', moTa: 'Khoa Cấp cứu và hồi sức', trangThai: true },
];

const defaultNotifications: ThongBao[] = [
  { id: 'TB-N-001', tieuDe: 'Phiếu yêu cầu mới', noiDung: 'Có phiếu yêu cầu cấp phát mới từ NV Bệnh viện cần duyệt', loai: 'info', nguoiNhan: 'ND-003', daDoc: false, ngayTao: '2026-03-24T08:00:00' },
  { id: 'TB-N-002', tieuDe: 'Tồn kho thấp', noiDung: 'Máy đo SpO2 chỉ còn 30 trong kho', loai: 'warning', nguoiNhan: 'ND-002', daDoc: false, ngayTao: '2026-03-23T15:30:00' },
  { id: 'TB-N-003', tieuDe: 'Phiếu đã duyệt', noiDung: 'Phiếu yêu cầu YCCF-001 đã được Trưởng khoa phê duyệt', loai: 'success', nguoiNhan: 'ND-004', daDoc: true, ngayTao: '2026-03-22T10:00:00' },
];

const defaultRequests: PhieuYeuCauCapPhat[] = [
  { maPhieu: 'YCCF-20260320-001', maNguoiYeuCau: 'ND-004', maThietBi: 'TB-001', maKhoa: 'K-001', soLuongYeuCau: 5, lyDo: 'Phục vụ khám bệnh thường quy', trangThai: 'CHO_DUYET', ngayTao: '2026-03-20' },
  { maPhieu: 'YCCF-20260318-002', maNguoiYeuCau: 'ND-004', maThietBi: 'TB-004', maKhoa: 'K-005', soLuongYeuCau: 50, lyDo: 'Bổ sung vật tư tiêm chủng', trangThai: 'DA_DUYET', ngayTao: '2026-03-18', ngayDuyet: '2026-03-19' },
];

// In-memory cache for API mode
let memoryCache: Record<string, any[]> = {};

function getStore<T>(key: string, defaults: T[]): T[] {
  // Check memory cache first
  if (memoryCache[key]) return memoryCache[key] as T[];
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

function setStore<T>(key: string, data: T[]) {
  memoryCache[key] = data;
  localStorage.setItem(key, JSON.stringify(data));
}

export const store = {
  getUsers: () => getStore<NguoiDung>('kho_users', defaultUsers),
  setUsers: (d: NguoiDung[]) => setStore('kho_users', d),

  getEquipment: () => getStore<ThietBi>('kho_equipment', defaultEquipment),
  setEquipment: (d: ThietBi[]) => setStore('kho_equipment', d),

  getInventory: () => getStore<TonKho>('kho_inventory', defaultInventory),
  setInventory: (d: TonKho[]) => setStore('kho_inventory', d),

  getSuppliers: () => getStore<NhaCungCap>('kho_suppliers', defaultSuppliers),
  setSuppliers: (d: NhaCungCap[]) => setStore('kho_suppliers', d),

  getDepartments: () => getStore<Khoa>('kho_departments', defaultDepartments),
  setDepartments: (d: Khoa[]) => setStore('kho_departments', d),

  getNotifications: () => getStore<ThongBao>('kho_notifications', defaultNotifications),
  setNotifications: (d: ThongBao[]) => setStore('kho_notifications', d),

  getRequests: () => getStore<PhieuYeuCauCapPhat>('kho_requests', defaultRequests),
  setRequests: (d: PhieuYeuCauCapPhat[]) => setStore('kho_requests', d),

  getExports: () => getStore<PhieuXuatKho>('kho_exports', []),
  setExports: (d: PhieuXuatKho[]) => setStore('kho_exports', d),

  getImports: () => getStore<PhieuNhapKho>('kho_imports', []),
  setImports: (d: PhieuNhapKho[]) => setStore('kho_imports', d),

  getAllocations: () => getStore<PhieuCapPhat>('kho_allocations', []),
  setAllocations: (d: PhieuCapPhat[]) => setStore('kho_allocations', d),

  getDamageReports: () => getStore<PhieuBaoHuHong>('kho_damage_reports', []),
  setDamageReports: (d: PhieuBaoHuHong[]) => setStore('kho_damage_reports', d),

  // Initialize store from API data
  initFromApi: (data: {
    users?: NguoiDung[];
    equipment?: ThietBi[];
    inventory?: TonKho[];
    suppliers?: NhaCungCap[];
    departments?: Khoa[];
    notifications?: ThongBao[];
    requests?: PhieuYeuCauCapPhat[];
    exports?: PhieuXuatKho[];
    imports?: PhieuNhapKho[];
    allocations?: PhieuCapPhat[];
    damageReports?: PhieuBaoHuHong[];
  }) => {
    if (data.users) setStore('kho_users', data.users);
    if (data.equipment) setStore('kho_equipment', data.equipment);
    if (data.inventory) setStore('kho_inventory', data.inventory);
    if (data.suppliers) setStore('kho_suppliers', data.suppliers);
    if (data.departments) setStore('kho_departments', data.departments);
    if (data.notifications) setStore('kho_notifications', data.notifications);
    if (data.requests) setStore('kho_requests', data.requests);
    if (data.exports) setStore('kho_exports', data.exports);
    if (data.imports) setStore('kho_imports', data.imports);
    if (data.allocations) setStore('kho_allocations', data.allocations);
    if (data.damageReports) setStore('kho_damage_reports', data.damageReports);
  },

  clearCache: () => { memoryCache = {}; },
};

let counters: Record<string, number> = {};
export function generateId(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const key = `${prefix}-${date}`;
  if (!counters[key]) counters[key] = 0;
  counters[key]++;
  return `${prefix}-${date}-${String(counters[key]).padStart(3, '0')}`;
}
