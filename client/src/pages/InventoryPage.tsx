import { useState, useMemo } from 'react';
import { store } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Archive } from 'lucide-react';

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const inventory = store.getInventory();
  const equipment = store.getEquipment();

  const data = useMemo(() =>
    inventory.map(inv => ({
      ...inv,
      thietBi: equipment.find(e => e.maThietBi === inv.maThietBi),
    })).filter(d =>
      d.thietBi?.tenThietBi.toLowerCase().includes(search.toLowerCase()) ||
      d.maThietBi.toLowerCase().includes(search.toLowerCase())
    ), [inventory, equipment, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Tìm kiếm tồn kho..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Mã thiết bị</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Tên thiết bị</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Trong kho</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Đang dùng</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Hư hỏng</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Tổng</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.maTonKho} className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-3 font-mono text-xs">{d.maThietBi}</td>
                <td className="p-3 font-medium">{d.thietBi?.tenThietBi || '-'}</td>
                <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{d.soLuongKho}</span></td>
                <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">{d.soLuongDangDung}</span></td>
                <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-warning/10 text-warning font-medium">{d.soLuongHu}</span></td>
                <td className="p-3 text-center font-bold">{d.soLuongKho + d.soLuongDangDung + d.soLuongHu}</td>
                <td className="p-3 text-xs text-muted-foreground">{d.ngayCapNhat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <div className="text-center py-12 text-muted-foreground">Không có dữ liệu tồn kho</div>}
    </div>
  );
}
