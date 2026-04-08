/**
 * Data Loader - Tải dữ liệu từ API vào store
 * Gọi sau khi đăng nhập thành công
 */
import { store } from './store';
import { isMockMode, fetchApi } from '@/services/api';
import { NguoiDung, ThietBi, TonKho, NhaCungCap, Khoa, ThongBao, PhieuYeuCauCapPhat, PhieuXuatKho, PhieuNhapKho, PhieuCapPhat, PhieuBaoHuHong, PhieuYeuCauNhap } from '@/types';

export async function loadAllData(userId?: string): Promise<void> {
  if (isMockMode()) return;

  try {
    const [equipment, inventory, requests, allocations, users] = await Promise.all([
      fetchApi<ThietBi[]>('/equipment'),
      fetchApi<TonKho[]>('/inventory'),
      fetchApi<PhieuYeuCauCapPhat[]>('/requests'),
      fetchApi<PhieuCapPhat[]>('/allocations'),
      fetchApi<NguoiDung[]>('/users')
    ]);

    store.initFromApi({
      equipment,
      inventory,
      requests,
      allocations,
      users
    });
    console.log('✅ All data loaded from API');
  } catch (err) {
    console.error('❌ Failed to load data from API:', err);
  }
}

/**
 * Refresh a specific data type from API
 */
export async function refreshData(type: string, userId?: string): Promise<void> {
  if (isMockMode()) return;

  try {
    switch (type) {
      case 'equipment': store.setEquipment(await fetchApi('/equipment')); break;
      case 'inventory': store.setInventory(await fetchApi('/inventory')); break;
      case 'suppliers': store.setSuppliers(await fetchApi('/suppliers')); break;
      case 'departments': store.setDepartments(await fetchApi('/departments')); break;
      case 'requests': store.setRequests(await fetchApi('/requests')); break;
      case 'imports': store.setImports(await fetchApi('/imports')); break;
      case 'exports': store.setExports(await fetchApi('/exports')); break;
      case 'allocations': store.setAllocations(await fetchApi('/allocations')); break;
      case 'damageReports': store.setDamageReports(await fetchApi('/damage-reports')); break;
      case 'importRequests': store.setImportRequests(await fetchApi('/import-requests')); break;
      case 'notifications':
        if (userId) store.setNotifications(await fetchApi(`/notifications?userId=${userId}`));
        break;
      case 'users': store.setUsers(await fetchApi('/users')); break;
    }
  } catch (err) {
    console.error(`Failed to refresh ${type}:`, err);
  }
}
