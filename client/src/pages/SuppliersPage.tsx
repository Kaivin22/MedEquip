import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateSupplier, apiUpdateSupplier } from '@/lib/apiSync';
import { NhaCungCap } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';

export default function SuppliersPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getSuppliers());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NhaCungCap | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<NhaCungCap | null>(null);
  const canEdit = user?.vaiTro === 'ADMIN';

  const [form, setForm] = useState({ tenNhaCungCap: '', diaChi: '', soDienThoai: '', email: '' });

  const filtered = useMemo(() =>
    data.filter(s => s.tenNhaCungCap.toLowerCase().includes(search.toLowerCase()) || s.maNhaCungCap.toLowerCase().includes(search.toLowerCase())), [data, search]);

  const openAdd = () => { setEditing(null); setForm({ tenNhaCungCap: '', diaChi: '', soDienThoai: '', email: '' }); setDialogOpen(true); };
  const openEdit = (s: NhaCungCap) => { setEditing(s); setForm({ tenNhaCungCap: s.tenNhaCungCap, diaChi: s.diaChi, soDienThoai: s.soDienThoai, email: s.email }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.tenNhaCungCap) { toast({ title: 'Lỗi', description: 'Vui lòng hãy nhập tên', variant: 'destructive' }); return; }
    try {
      if (editing) {
        await apiUpdateSupplier(editing.maNhaCungCap, form);
        setData(store.getSuppliers());
        toast({ title: 'Cập nhật thành công' });
      } else {
        await apiCreateSupplier(form);
        setData(store.getSuppliers());
        toast({ title: 'Thêm thành công' });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = (s: NhaCungCap) => {
    const eq = store.getEquipment().some(e => e.maNhaCungCap === s.maNhaCungCap);
    if (eq) { toast({ title: 'Không thể xóa', description: 'NCC đang có thiết bị liên kết', variant: 'destructive' }); return; }
    const updated = data.filter(x => x.maNhaCungCap !== s.maNhaCungCap);
    store.setSuppliers(updated); setData(updated); toast({ title: 'Đã xóa' });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm nhà cung cấp..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canEdit && <Button onClick={openAdd} className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Thêm NCC</Button>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Tên NCC</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Địa chỉ</th>
            <th className="text-left p-3 font-medium text-muted-foreground">SĐT</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
          </tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.maNhaCungCap} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{s.maNhaCungCap}</td>
                <td className="p-3 font-medium">{s.tenNhaCungCap}</td>
                <td className="p-3 text-muted-foreground">{s.diaChi}</td>
                <td className="p-3">{s.soDienThoai}</td>
                <td className="p-3">{s.email}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setViewing(s); setViewOpen(true); }}><Eye className="w-3.5 h-3.5" /></Button>
                    {canEdit && <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>}
                    {canEdit && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(s)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Không tìm thấy</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Sửa NCC' : 'Thêm NCC mới'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên NCC *</Label><Input value={form.tenNhaCungCap} onChange={e => setForm(f => ({ ...f, tenNhaCungCap: e.target.value }))} /></div>
            <div><Label>Địa chỉ</Label><Input value={form.diaChi} onChange={e => setForm(f => ({ ...f, diaChi: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SĐT</Label><Input value={form.soDienThoai} onChange={e => setForm(f => ({ ...f, soDienThoai: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">{editing ? 'Cập nhật' : 'Thêm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chi tiết Nhà cung cấp</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Mã:</span> <strong>{viewing.maNhaCungCap}</strong></p>
              <p><span className="text-muted-foreground">Tên:</span> <strong>{viewing.tenNhaCungCap}</strong></p>
              <p><span className="text-muted-foreground">Địa chỉ:</span> {viewing.diaChi}</p>
              <p><span className="text-muted-foreground">SĐT:</span> {viewing.soDienThoai}</p>
              <p><span className="text-muted-foreground">Email:</span> {viewing.email}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
