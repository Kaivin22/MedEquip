import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateDepartment, apiDeleteDepartment, apiUpdateDepartment } from '@/lib/apiSync';
import { Khoa } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getDepartments());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Khoa | null>(null);
  const canEdit = user?.vaiTro === 'ADMIN';

  const [form, setForm] = useState({ tenKhoa: '', moTa: '' });
  const filtered = useMemo(() => data.filter(k => k.tenKhoa.toLowerCase().includes(search.toLowerCase())), [data, search]);

  const openAdd = () => { setEditing(null); setForm({ tenKhoa: '', moTa: '' }); setDialogOpen(true); };
  const openEdit = (k: Khoa) => { setEditing(k); setForm({ tenKhoa: k.tenKhoa, moTa: k.moTa }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.tenKhoa) { toast({ title: 'Lỗi', description: 'Vui lòng nhập tên khoa', variant: 'destructive' }); return; }
    try {
      if (editing) {
        const res = await apiUpdateDepartment(editing.maKhoa, form);
        if (res.success) {
          toast({ title: 'Cập nhật thành công' });
          setData(store.getDepartments());
          setDialogOpen(false);
        } else {
          toast({ title: 'Lỗi', description: res.message || 'Cập nhật thất bại', variant: 'destructive' });
        }
      } else {
        const res = await apiCreateDepartment(form);
        if (res.success) {
          toast({ title: 'Thêm thành công' });
          setData(store.getDepartments());
          setDialogOpen(false);
        } else {
          toast({ title: 'Lỗi', description: res.message || 'Thêm thất bại', variant: 'destructive' });
        }
      }
    } catch (err) {
      toast({ title: 'Lỗi', description: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const handleDelete = async (k: Khoa) => {
    try {
      const result = await apiDeleteDepartment(k.maKhoa);
      if (result.success) {
        const updated = store.getDepartments();
        setData(updated);
        toast({ title: 'Đã xóa' });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Xóa thất bại', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Lỗi', description: 'Không thể xóa khoa', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm khoa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canEdit && <Button onClick={openAdd} className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Thêm Khoa</Button>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã Khoa</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Tên Khoa</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Mô tả</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
          </tr></thead>
          <tbody>
            {filtered.map(k => (
              <tr key={k.maKhoa} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{k.maKhoa}</td>
                <td className="p-3 font-medium">{k.tenKhoa}</td>
                <td className="p-3 text-muted-foreground">{k.moTa}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${k.trangThai ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {k.trangThai ? 'Hoạt động' : 'Ngưng'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {canEdit && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(k)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(k)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Không tìm thấy</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Sửa Khoa' : 'Thêm Khoa mới'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên Khoa *</Label><Input value={form.tenKhoa} onChange={e => setForm(f => ({ ...f, tenKhoa: e.target.value }))} /></div>
            <div><Label>Mô tả</Label><Textarea value={form.moTa} onChange={e => setForm(f => ({ ...f, moTa: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">{editing ? 'Cập nhật' : 'Thêm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
 