import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { ROLE_LABELS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, Truck, Building2, FileText, AlertTriangle, TrendingUp, Archive } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const equipment = store.getEquipment();
  const inventory = store.getInventory();
  const suppliers = store.getSuppliers();
  const departments = store.getDepartments();
  const requests = store.getRequests();
  const users = store.getUsers();

  const pendingRequests = requests.filter(r => r.trangThai === 'CHO_DUYET').length;
  const totalStock = inventory.reduce((s, i) => s + i.soLuongKho, 0);
  const totalDamaged = inventory.reduce((s, i) => s + i.soLuongHu, 0);
  const totalInUse = inventory.reduce((s, i) => s + i.soLuongDangDung, 0);

  const stats = [
    { label: 'Thiết bị', value: equipment.length, icon: Package, color: 'text-primary bg-primary/10' },
    { label: 'Tồn kho', value: totalStock, icon: Archive, color: 'text-accent bg-accent/10' },
    { label: 'Đang dùng', value: totalInUse, icon: TrendingUp, color: 'text-info bg-info/10' },
    { label: 'Hư hỏng', value: totalDamaged, icon: AlertTriangle, color: 'text-warning bg-warning/10' },
    { label: 'Nhà cung cấp', value: suppliers.length, icon: Truck, color: 'text-primary bg-primary/10' },
    { label: 'Khoa', value: departments.length, icon: Building2, color: 'text-accent bg-accent/10' },
    { label: 'Phiếu chờ duyệt', value: pendingRequests, icon: FileText, color: 'text-warning bg-warning/10' },
    { label: 'Người dùng', value: users.length, icon: Users, color: 'text-primary bg-primary/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Xin chào, {user.hoTen}!</h2>
        <p className="text-muted-foreground">Vai trò: {ROLE_LABELS[user.vaiTro]}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Phiếu yêu cầu gần đây</CardTitle></CardHeader>
          <CardContent>
            {requests.slice(0, 5).map(r => {
              const tb = equipment.find(e => e.maThietBi === r.maThietBi);
              return (
                <div key={r.maPhieu} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.maPhieu}</p>
                    <p className="text-xs text-muted-foreground">{tb?.tenThietBi} - SL: {r.soLuongYeuCau}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.trangThai === 'CHO_DUYET' ? 'bg-warning/10 text-warning' :
                    r.trangThai === 'DA_DUYET' ? 'bg-success/10 text-success' :
                    'bg-destructive/10 text-destructive'
                  }`}>
                    {r.trangThai === 'CHO_DUYET' ? 'Chờ duyệt' : r.trangThai === 'DA_DUYET' ? 'Đã duyệt' : 'Từ chối'}
                  </span>
                </div>
              );
            })}
            {requests.length === 0 && <p className="text-sm text-muted-foreground">Chưa có phiếu yêu cầu</p>}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Tồn kho thiết bị</CardTitle></CardHeader>
          <CardContent>
            {inventory.slice(0, 5).map(inv => {
              const tb = equipment.find(e => e.maThietBi === inv.maThietBi);
              return (
                <div key={inv.maTonKho} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{tb?.tenThietBi}</p>
                    <p className="text-xs text-muted-foreground">{tb?.maThietBi}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-primary font-medium">Kho: {inv.soLuongKho}</span>
                    <span className="text-accent font-medium">Dùng: {inv.soLuongDangDung}</span>
                    <span className="text-warning font-medium">Hư: {inv.soLuongHu}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
