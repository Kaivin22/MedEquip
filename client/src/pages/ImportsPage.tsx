import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateImport } from '@/lib/apiSync';
import '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Search } from 'lucide-react';

export default function ImportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getImports());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const equipment = store.getEquipment();
  const suppliers = store.getSuppliers();
  const users = store.getUsers();
  const canCreate = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';

  const [form, setForm] = useState({ maThietBi: '', maNhaCungCap: '', soLuongNhap: 1, ghiChu: '' });

  const handleCreate = async () => {
    if (!form.maThietBi || !form.maNhaCungCap) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập đầy đủ thông tin ', variant: 'destructive' }); return;
    }
    if (form.soLuongNhap < 1) {
      toast({ title: 'Lỗi', description: 'Số lượng phải lớn hơn 0', variant: 'destructive' }); return;
    }
    try {
      const result = await apiCreateImport({ ...form, maNhanVienKho: user!.maNguoiDung });
      if (result.success) {
        setData(store.getImports());
        setDialogOpen(false);
        toast({ title: 'Thành công', description: 'Đã nhập kho thành công' });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi xảy ra', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm phiếu nhập..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canCreate && <Button onClick={() => { setForm({ maThietBi: '', maNhaCungCap: '', soLuongNhap: 1, ghiChu: '' }); setDialogOpen(true); }} className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Lập phiếu nhập</Button>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã phiếu</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Thiết bị</th>
            <th className="text-left p-3 font-medium text-muted-foreground">NCC</th>
            <th className="text-left p-3 font-medium text-muted-foreground">NV Kho</th>
            <th className="text-center p-3 font-medium text-muted-foreground">SL</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Ngày nhập</th>
          </tr></thead>
          <tbody>
            {data.filter(d => d.maPhieu.toLowerCase().includes(search.toLowerCase())).map(d => (
              <tr key={d.maPhieu} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{d.maPhieu}</td>
                <td className="p-3">{equipment.find(e => e.maThietBi === d.maThietBi)?.tenThietBi}</td>
                <td className="p-3">{suppliers.find(s => s.maNhaCungCap === d.maNhaCungCap)?.tenNhaCungCap}</td>
                <td className="p-3">{users.find(u => u.maNguoiDung === d.maNhanVienKho)?.hoTen}</td>
                <td className="p-3 text-center font-medium">{d.soLuongNhap}</td>
                <td className="p-3 text-xs text-muted-foreground">{d.ngayNhap.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <div className="text-center py-12 text-muted-foreground">Chưa có phiếu nhập kho</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lập phiếu nhập kho</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Thiết bị *</Label>
              <Select value={form.maThietBi} onValueChange={v => setForm(f => ({ ...f, maThietBi: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn thiết bị" /></SelectTrigger>
                <SelectContent>{equipment.filter(e => e.trangThai).map(e => <SelectItem key={e.maThietBi} value={e.maThietBi}>{e.tenThietBi}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nhà cung cấp *</Label>
              <Select value={form.maNhaCungCap} onValueChange={v => setForm(f => ({ ...f, maNhaCungCap: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                <SelectContent>{suppliers.filter(s => s.trangThai).map(s => <SelectItem key={s.maNhaCungCap} value={s.maNhaCungCap}>{s.tenNhaCungCap}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Số lượng nhập *</Label>
              <Input type="number" min={1} value={form.soLuongNhap} onChange={e => {
                const val = parseInt(e.target.value) || 0;
                setForm(f => ({ ...f, soLuongNhap: val < 0 ? 0 : val }));
              }} />
            </div>
            <div><Label>Ghi chú</Label><Textarea value={form.ghiChu} onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">Nhập kho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
