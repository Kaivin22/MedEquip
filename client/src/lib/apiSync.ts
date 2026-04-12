/**
 * API Sync - Wrapper functions that sync store mutations to API
 * When in API mode, these call the API and then refresh store
 * When in mock mode, they just update store directly
 */
import { isMockMode, fetchApi } from '@/services/api';
import { store, generateId } from './store';
import { refreshData } from './dataLoader';
import { NguoiDung, ThietBi, NhaCungCap, Khoa, PhieuYeuCauCapPhat, PhieuNhapKho, PhieuXuatKho, PhieuCapPhat, PhieuBaoHuHong, UserRole, PhieuYeuCauNhap, PhieuTra } from '@/types';

// ---- Users ----
export async function apiCreateUser(data: { hoTen: string; email: string; matKhau: string; vaiTro: UserRole }) {
  if (isMockMode()) {
    const users = store.getUsers();
    if (users.some(u => u.email === data.email)) return { success: false, message: 'Email đã tồn tại' };
    const newUser: NguoiDung = { maNguoiDung: generateId('ND'), ...data, trangThai: true, ngayTao: new Date().toISOString(), ngayCapNhat: new Date().toISOString() };
    users.push(newUser);
    store.setUsers(users);
    return { success: true, user: newUser };
  }
  const result = await fetchApi<any>('/users', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) await refreshData('users');
  return result;
}

export async function apiUpdateUser(userId: string, updates: Partial<NguoiDung>) {
  if (isMockMode()) {
    const users = store.getUsers();
    store.setUsers(users.map(u => u.maNguoiDung === userId ? { ...u, ...updates, ngayCapNhat: new Date().toISOString() } : u));
    return { success: true };
  }
  const result = await fetchApi<any>(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(updates) });
  if (result.success) await refreshData('users');
  return result;
}

export async function apiDeleteUser(userId: string) {
  if (isMockMode()) {
    store.setUsers(store.getUsers().filter(u => u.maNguoiDung !== userId));
    return { success: true };
  }
  const result = await fetchApi<any>(`/users/${userId}`, { method: 'DELETE' });
  if (result.success) await refreshData('users');
  return result;
}

export async function apiChangePassword(userId: string, currentPassword: string, newPassword: string) {
  if (isMockMode()) {
    const users = store.getUsers();
    const user = users.find(u => u.maNguoiDung === userId);
    if (!user) return { success: false, message: 'Không tìm thấy người dùng.' };
    if (user.matKhau !== currentPassword) return { success: false, message: 'Mật khẩu hiện tại không đúng!' };
    store.setUsers(users.map(u => u.maNguoiDung === userId ? { ...u, matKhau: newPassword, ngayCapNhat: new Date().toISOString() } : u));
    return { success: true, message: 'Đổi mật khẩu thành công!' };
  }
  return fetchApi<any>('/auth/change-password', { method: 'PUT', body: JSON.stringify({ userId, currentPassword, newPassword }) });
}

// ---- Equipment ----
export async function apiCreateEquipment(data: Omit<ThietBi, 'maThietBi' | 'trangThai' | 'ngayTao'>) {
  if (isMockMode()) {
    const equipment = store.getEquipment();
    if (equipment.some(e => e.tenThietBi === data.tenThietBi)) return { success: false, message: 'Thiết bị đã tồn tại' };
    const newItem: ThietBi = { maThietBi: generateId('TB'), ...data, trangThai: true, ngayTao: new Date().toISOString() };
    equipment.push(newItem);
    store.setEquipment(equipment);
    const inv = store.getInventory();
    inv.push({ maTonKho: generateId('TK'), maThietBi: newItem.maThietBi, soLuongKho: 0, soLuongDangDung: 0, ngayCapNhat: new Date().toISOString() });
    store.setInventory(inv);
    return { success: true, equipment: newItem };
  }
  const result = await fetchApi<any>('/equipment', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) {
    await refreshData('equipment');
    await refreshData('inventory');
  }
  return result;
}

export async function apiDeleteEquipment(maThietBi: string) {
  if (isMockMode()) {
    const inv = store.getInventory().find(i => i.maThietBi === maThietBi);
    if (inv && (inv.soLuongDangDung > 0 || inv.soLuongKho > 0)) return { success: false, message: 'Thiết bị đang có tồn kho' };
    store.setEquipment(store.getEquipment().filter(e => e.maThietBi !== maThietBi));
    store.setInventory(store.getInventory().filter(i => i.maThietBi !== maThietBi));
    return { success: true };
  }
  const result = await fetchApi<any>(`/equipment/${maThietBi}`, { method: 'DELETE' });
  if (result.success) {
    await refreshData('equipment');
    await refreshData('inventory');
  }
  return result;
}

export async function apiUpdateEquipment(maThietBi: string, data: Partial<Omit<ThietBi, 'maThietBi' | 'ngayTao'>>) {
  if (isMockMode()) {
    store.setEquipment(store.getEquipment().map(e => e.maThietBi === maThietBi ? { ...e, ...data } as ThietBi : e));
    return { success: true };
  }
  const result = await fetchApi<any>(`/equipment/${maThietBi}`, { method: 'PUT', body: JSON.stringify(data) });
  if (result.success) await refreshData('equipment');
  return result;
}

// ---- Suppliers ----
export async function apiCreateSupplier(data: Omit<NhaCungCap, 'maNhaCungCap' | 'trangThai'>) {
  if (isMockMode()) {
    const ncc: NhaCungCap = { maNhaCungCap: generateId('NCC'), ...data, trangThai: true };
    const suppliers = store.getSuppliers();
    suppliers.push(ncc);
    store.setSuppliers(suppliers);
    return { success: true, supplier: ncc };
  }
  const result = await fetchApi<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) await refreshData('suppliers');
  return result;
}

export async function apiUpdateSupplier(id: string, data: Partial<NhaCungCap>) {
  if (isMockMode()) {
    store.setSuppliers(store.getSuppliers().map(s => s.maNhaCungCap === id ? { ...s, ...data } : s));
    return { success: true };
  }
  const result = await fetchApi<any>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (result.success) await refreshData('suppliers');
  return result;
}

export async function apiDeleteSupplier(id: string) {
  if (isMockMode()) {
    store.setSuppliers(store.getSuppliers().filter(s => s.maNhaCungCap !== id));
    return { success: true };
  }
  const result = await fetchApi<any>(`/suppliers/${id}`, { method: 'DELETE' });
  if (result.success) await refreshData('suppliers');
  return result;
}

// ---- Departments ----
export async function apiCreateDepartment(data: Omit<Khoa, 'maKhoa' | 'trangThai'>) {
  if (isMockMode()) {
    const dept: Khoa = { maKhoa: generateId('K'), ...data, trangThai: true };
    const depts = store.getDepartments();
    depts.push(dept);
    store.setDepartments(depts);
    return { success: true, department: dept };
  }
  const result = await fetchApi<any>('/departments', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) await refreshData('departments');
  return result;
}

export async function apiUpdateDepartment(id: string, data: Partial<Khoa>) {
  if (isMockMode()) {
    if (data.trangThai === false) {
      const allocations = store.getAllocations();
      if (allocations.some(a => a.maKhoa === id)) {
        return { success: false, message: 'Không thể ngừng hoạt động khoa khi có thiết bị đang sử dụng' };
      }
    }
    store.setDepartments(store.getDepartments().map(d => d.maKhoa === id ? { ...d, ...data } : d));
    return { success: true };
  }
  const result = await fetchApi<any>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (result.success) await refreshData('departments');
  return result;
}

export async function apiDeleteDepartment(id: string) {
  if (isMockMode()) {
    const allocations = store.getAllocations();
    if (allocations.some(a => a.maKhoa === id)) {
      return { success: false, message: 'Không thể xóa khoa khi có thiết bị đang sử dụng' };
    }
    store.setDepartments(store.getDepartments().filter(d => d.maKhoa !== id));
    return { success: true };
  }
  const result = await fetchApi<any>(`/departments/${id}`, { method: 'DELETE' });
  if (result.success) await refreshData('departments');
  return result;
}

// ---- Requests ----
export async function apiCreateRequest(data: Omit<PhieuYeuCauCapPhat, 'maPhieu' | 'trangThai' | 'ngayTao'>) {
  if (isMockMode()) {
    const phieu: PhieuYeuCauCapPhat = { maPhieu: generateId('YCCF'), ...data, trangThai: 'CHO_DUYET', ngayTao: new Date().toISOString() };
    const requests = store.getRequests();
    requests.push(phieu);
    store.setRequests(requests);
    return { success: true, phieu };
  }
  const result = await fetchApi<any>('/requests', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) await refreshData('requests');
  return result;
}

export async function apiApproveRequest(maPhieu: string, approved: boolean, lyDo?: string) {
  if (isMockMode()) {
    const requests = store.getRequests();
    store.setRequests(requests.map(r => r.maPhieu === maPhieu ? {
      ...r,
      trangThai: approved ? 'DA_DUYET' as const : 'TU_CHOI' as const,
      ngayDuyet: new Date().toISOString(),
      lyDoTuChoi: lyDo
    } : r));
    return { success: true };
  }
  const result = await fetchApi<any>(`/requests/${maPhieu}/approve-dept`, { method: 'PUT', body: JSON.stringify({ approved, lyDo }) });
  if (result.success) await refreshData('requests');
  return result;
}

export async function apiDeleteRequest(maPhieu: string) {
  if (isMockMode()) {
    store.setRequests(store.getRequests().filter(r => r.maPhieu !== maPhieu));
    return { success: true };
  }
  const result = await fetchApi<any>(`/requests/${maPhieu}`, { method: 'DELETE' });
  if (result.success) await refreshData('requests');
  return result;
}

// ---- Import Requests ----
export async function apiCreateImportRequest(data: Omit<PhieuYeuCauNhap, 'maPhieu' | 'trangThai' | 'ngayTao' | 'ngayDuyet' | 'nguoiDuyet' | 'lyDoTuChoi'>) {
  if (isMockMode()) {
    const phieu: PhieuYeuCauNhap = { maPhieu: generateId('YCN'), ...data, trangThai: 'CHO_DUYET', ngayTao: new Date().toISOString() };
    const requests = store.getImportRequests();
    requests.push(phieu);
    store.setImportRequests(requests);
    return { success: true, phieu };
  }
  const result = await fetchApi<any>('/import-requests', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) await refreshData('importRequests');
  return result;
}

export async function apiApproveImportRequest(maPhieu: string, approved: boolean, lyDo?: string) {
  if (isMockMode()) {
    const requests = store.getImportRequests();
    const reqIndex = requests.findIndex(r => r.maPhieu === maPhieu);
    if (reqIndex === -1) return { success: false, message: 'Không tìm thấy phiếu' };
    
    const request = requests[reqIndex];
    
    if (approved) {
      // Create Equipment automatically
      const equipment = store.getEquipment();
      const newMaThietBi = generateId('TB');
      const newItem: ThietBi = {
        maThietBi: newMaThietBi,
        tenThietBi: request.tenThietBi,
        loaiThietBi: request.loaiThietBi,
        donViTinh: request.donViTinh,
        moTa: request.moTa || request.mucDichSuDung || '',
        maNhaCungCap: request.maNhaCungCap || 'NCC001', // Fallback
        hinhAnh: request.hinhAnh,
        trangThai: true,
        ngayTao: new Date().toISOString()
      };
      equipment.push(newItem);
      store.setEquipment(equipment);

      // Create Inventory automatically
      const inv = store.getInventory();
      inv.push({
        maTonKho: generateId('TK'),
        maThietBi: newMaThietBi,
        soLuongKho: request.soLuong,
        soLuongDangDung: 0,
        ngayCapNhat: new Date().toISOString()
      });
      store.setInventory(inv);
    }

    store.setImportRequests(requests.map(r => r.maPhieu === maPhieu ? {
      ...r,
      trangThai: approved ? 'DA_DUYET' as const : 'TU_CHOI' as const,
      ngayDuyet: new Date().toISOString(),
      lyDoTuChoi: lyDo,
      nguoiDuyet: 'MOCK_ADMIN'
    } : r));
    
    return { success: true };
  }
  const result = await fetchApi<any>(`/import-requests/${maPhieu}/approve`, { method: 'PUT', body: JSON.stringify({ approved, lyDo }) });
  if (result.success) {
    await refreshData('importRequests');
    if (approved) {
      await refreshData('equipment');
      await refreshData('inventory');
    }
  }
  return result;
}

export async function apiDeleteImportRequest(maPhieu: string) {
  if (isMockMode()) {
    store.setImportRequests(store.getImportRequests().filter(r => r.maPhieu !== maPhieu));
    return { success: true };
  }
  const result = await fetchApi<any>(`/import-requests/${maPhieu}`, { method: 'DELETE' });
  if (result.success) await refreshData('importRequests');
  return result;
}

// ---- Imports ----
export async function apiCreateImport(data: { maThietBi: string; maNhaCungCap: string; soLuongNhap: number; maNhanVienKho: string; ghiChu: string }) {
  if (isMockMode()) {
    const phieu: PhieuNhapKho = { maPhieu: generateId('NK'), ...data, ngayNhap: new Date().toISOString() };
    const imports = store.getImports();
    imports.push(phieu);
    store.setImports(imports);
    const inv = store.getInventory();
    const idx = inv.findIndex(i => i.maThietBi === data.maThietBi);
    if (idx >= 0) { inv[idx].soLuongKho += data.soLuongNhap; inv[idx].ngayCapNhat = new Date().toISOString(); store.setInventory(inv); }
    return { success: true, phieu };
  }
  const result = await fetchApi<any>('/imports', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) {
    await refreshData('imports');
    await refreshData('inventory');
  }
  return result;
}

export async function apiDeleteImport(maPhieu: string) {
  if (isMockMode()) {
    store.setImports(store.getImports().filter(i => i.maPhieu !== maPhieu));
    return { success: true };
  }
  const result = await fetchApi<any>(`/imports/${maPhieu}`, { method: 'DELETE' });
  if (result.success) await refreshData('imports');
  return result;
}

// ---- Exports ----
export async function apiCreateExport(data: { maThietBi: string; soLuong: number; lyDoXuat: string; maNhanVienKho: string; ghiChu: string }) {
  if (isMockMode()) {
    const phieu: PhieuXuatKho = { maPhieu: generateId('XK'), ...data, trangThai: 'DA_LAP', ngayXuat: new Date().toISOString() };
    const exports = store.getExports();
    exports.push(phieu);
    store.setExports(exports);
    return { success: true, phieu };
  }
  const result = await fetchApi<any>('/exports', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) await refreshData('exports');
  return result;
}

export async function apiConfirmExport(maPhieu: string) {
  if (isMockMode()) {
    const exports = store.getExports();
    const phieu = exports.find(e => e.maPhieu === maPhieu);
    if (!phieu) return { success: false };
    store.setExports(exports.map(e => e.maPhieu === maPhieu ? { ...e, trangThai: 'DA_XUAT' as const } : e));
    const inv = store.getInventory();
    const idx = inv.findIndex(i => i.maThietBi === phieu.maThietBi);
    if (idx >= 0) {
      let remaining = phieu.soLuong;
      const fromKho = Math.min(remaining, inv[idx].soLuongKho);
      inv[idx].soLuongKho -= fromKho;
      remaining -= fromKho;
      inv[idx].ngayCapNhat = new Date().toISOString();
      store.setInventory(inv);
    }
    return { success: true };
  }
  const result = await fetchApi<any>(`/exports/${maPhieu}/confirm`, { method: 'PUT' });
  if (result.success) {
    await refreshData('exports');
    await refreshData('inventory');
  }
  return result;
}

// ---- Allocations ----
export async function apiCreateAllocation(data: { maPhieuYeuCau: string; maNhanVienKho: string; maThietBi: string; maNguoiMuon: string; maKhoa: string; soLuongCapPhat: number; ghiChu: string }) {
  if (isMockMode()) {
    const phieu: PhieuCapPhat = { maPhieu: generateId('CP'), ...data, ngayCapPhat: new Date().toISOString() };
    const allocations = store.getAllocations();
    allocations.push(phieu);
    store.setAllocations(allocations);
    
    // Update Request status to DA_CAP_PHAT
    const requests = store.getRequests();
    store.setRequests(requests.map(r => r.maPhieu === data.maPhieuYeuCau ? { ...r, trangThai: 'DA_CAP_PHAT' as const } : r));

    const inv = store.getInventory();
    const idx = inv.findIndex(i => i.maThietBi === data.maThietBi);
    if (idx >= 0) { 
      inv[idx].soLuongKho -= data.soLuongCapPhat; 
      inv[idx].soLuongDangDung += data.soLuongCapPhat; 
      inv[idx].ngayCapNhat = new Date().toISOString(); 
      store.setInventory(inv); 
    }
    return { success: true, phieu };
  }
  const result = await fetchApi<any>('/allocations', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) {
    await refreshData('allocations');
    await refreshData('inventory');
    await refreshData('requests');
  }
  return result;
}

// ---- Damage Reports ----
export async function apiCreateDamageReport(data: { maNguoiBao: string; maThietBi: string; maKhoa: string; soLuongHu: number; moTaHuHong: string }) {
  if (isMockMode()) {
    const report: PhieuBaoHuHong = { maPhieu: generateId('BHH'), ...data, trangThai: 'CHO_XU_LY', ngayBao: new Date().toISOString() };
    const reports = store.getDamageReports();
    reports.push(report);
    store.setDamageReports(reports);
    const inv = store.getInventory();
    const idx = inv.findIndex(i => i.maThietBi === data.maThietBi);
    if (idx >= 0) {
      const moveQty = Math.min(data.soLuongHu, inv[idx].soLuongDangDung);
      inv[idx].soLuongDangDung -= moveQty;
      inv[idx].ngayCapNhat = new Date().toISOString();
      store.setInventory(inv);
    }
    return { success: true, report };
  }
  const result = await fetchApi<any>('/damage-reports', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) {
    await refreshData('damageReports');
    await refreshData('inventory');
  }
  return result;
}

export async function apiResolveDamageReport(maPhieu: string) {
  if (isMockMode()) {
    store.setDamageReports(store.getDamageReports().map(r => r.maPhieu === maPhieu ? { ...r, trangThai: 'DA_XU_LY' as const, ngayXuLy: new Date().toISOString() } : r));
    return { success: true };
  }
  const result = await fetchApi<any>(`/damage-reports/${maPhieu}/resolve`, { method: 'PUT', body: JSON.stringify({ ghiChu: '' }) });
  if (result.success) await refreshData('damageReports');
  return result;
}

// ---- Notifications ----
export async function apiMarkAsRead(notificationId: string) {
  if (isMockMode()) {
    store.setNotifications(store.getNotifications().map(n => n.id === notificationId ? { ...n, daDoc: true } : n));
    return { success: true };
  }
  return fetchApi<any>(`/notifications/${notificationId}/read`, { method: 'PUT' });
}

export async function apiMarkAllAsRead(userId: string) {
  if (isMockMode()) {
    store.setNotifications(store.getNotifications().map(n => n.nguoiNhan === userId ? { ...n, daDoc: true } : n));
    return { success: true };
  }
  return fetchApi<any>('/notifications/read-all', { method: 'PUT', body: JSON.stringify({ userId }) });
}

// ---- Returns ----
export async function apiCreateReturn(data: { maNguoiTra: string; maKhoa: string; chiTiet: { maThietBi: string; soLuongTra: number }[] }) {
  if (isMockMode()) {
    const maPhieu = generateId('PT');
    const qrCode = `RETURN:${maPhieu}`;
    const phieu: PhieuTra = {
      maPhieu,
      ...data,
      trangThai: 'CHO_NHAN',
      ngayTao: new Date().toISOString(),
      qrCode,
    };
    const returns = store.getReturns();
    returns.push(phieu);
    store.setReturns(returns);
    return { success: true, phieu: { ...phieu, qrCode } };
  }
  const result = await fetchApi<any>('/returns', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) await refreshData('returns');
  return result;
}

export async function apiAcceptReturn(data: { maPhieuTra: string; maNguoiNhan: string }) {
  if (isMockMode()) {
    const returns = store.getReturns();
    const phieu = returns.find(r => r.maPhieu === data.maPhieuTra);
    if (!phieu) return { success: false, message: 'Không tìm thấy phiếu trả.' };
    if (phieu.trangThai !== 'CHO_NHAN') return { success: false, message: 'Phiếu này đã được xử lý.' };

    // Update tồn kho: cộng lại số lượng trả về kho
    const inv = store.getInventory();
    for (const ct of phieu.chiTiet) {
      const idx = inv.findIndex(i => i.maThietBi === ct.maThietBi);
      if (idx >= 0) {
        inv[idx].soLuongKho += ct.soLuongTra;
        inv[idx].soLuongDangDung = Math.max(0, inv[idx].soLuongDangDung - ct.soLuongTra);
        inv[idx].ngayCapNhat = new Date().toISOString();
      }
    }
    store.setInventory(inv);
    store.setReturns(returns.map(r => r.maPhieu === data.maPhieuTra ? { ...r, trangThai: 'DA_NHAN' as const } : r));
    return { success: true };
  }
  const result = await fetchApi<any>('/returns/accept', { method: 'POST', body: JSON.stringify(data) });
  if (result.success) {
    await refreshData('returns');
    await refreshData('inventory');
  }
  return result;
}
