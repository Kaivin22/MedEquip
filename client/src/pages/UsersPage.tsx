import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateUser, apiUpdateUser, apiDeleteUser } from '@/lib/apiSync';
import { NguoiDung, UserRole, ROLE_LABELS, ROLE_COLORS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getUsers());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NguoiDung | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<NguoiDung | null>(null);

  const [form, setForm] = useState({ hoTen: '', email: '', matKhau: '123456', vaiTro: 'NV_BV' as UserRole, trangThai: true });
  const filtered = useMemo(() => data.filter(u => u.hoTen.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search)), [data, search]);

  const openAdd = () => { setEditing(null); setForm({ hoTen: '', email: '', matKhau: '123456', vaiTro: 'NV_BV', trangThai: true }); setDialogOpen(true); };
  const openEdit = (u: NguoiDung) => { setEditing(u); setForm({ hoTen: u.hoTen, email: u.email, matKhau: '', vaiTro: u.vaiTro, trangThai: u.trangThai }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.hoTen || !form.email) { toast({ title: 'Lỗi', description: 'Nhập đầy đủ thông tin', variant: 'destructive' }); return; }
    
    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) { 
      toast({ title: 'Lỗi', description: 'Vui lòng nhập email hợp lệ (phải có @ và .)', variant: 'destructive' }); 
      return; 
    }

    try {
      if (editing) {
        const result = await apiUpdateUser(editing.maNguoiDung, form);
        if (result.success) { setData(store.getUsers()); toast({ title: 'Cập nhật thành công' }); }
        else toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      } else {
        const result = await apiCreateUser(form);
        if (result.success) { setData(store.getUsers()); toast({ title: 'Thêm thành công' }); }
        else toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteClick = (u: NguoiDung) => {
    if (user?.maNguoiDung === u.maNguoiDung) {
      toast({ title: 'Cảnh báo', description: 'Tài khoản bạn đang đăng nhập nên không thể xóa tài khoản', variant: 'destructive' });
      return;
    }
    setItemToDelete(u);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await apiDeleteUser(itemToDelete.maNguoiDung);
      setData(store.getUsers());
      toast({ title: 'Đã xóa' });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm người dùng..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Thêm tài khoản</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Họ tên</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Vai trò</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
          </tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.maNguoiDung} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{u.maNguoiDung}</td>
                <td className="p-3 font-medium">{u.hoTen}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.vaiTro]}`}>{ROLE_LABELS[u.vaiTro]}</span></td>
                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${u.trangThai ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{u.trangThai ? 'Hoạt động' : 'Vô hiệu'}</span></td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteClick(u)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Họ tên *</Label><Input value={form.hoTen} onChange={e => setForm(f => ({ ...f, hoTen: e.target.value }))} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Mật khẩu</Label><Input type="password" value={form.matKhau} onChange={e => setForm(f => ({ ...f, matKhau: e.target.value }))} /></div>
            <div>
              <Label>Vai trò *</Label>
              <Select value={form.vaiTro} onValueChange={v => setForm(f => ({ ...f, vaiTro: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <div>
                <Label>Trạng thái</Label>
                <Select value={form.trangThai ? 'true' : 'false'} onValueChange={v => setForm(f => ({ ...f, trangThai: v === 'true' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Hoạt động</SelectItem>
                    <SelectItem value="false">Vô hiệu hóa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">{editing ? 'Cập nhật' : 'Thêm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa tài khoản</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Bạn có chắc chắn muốn xóa tài khoản <strong>{itemToDelete?.hoTen}</strong> không? Hành động này không thể hoàn tác.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDelete}>Xóa tài khoản</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
