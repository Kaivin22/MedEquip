import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { ROLE_LABELS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, Shield, Calendar, Save, KeyRound } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    hoTen: user?.hoTen || '',
    email: user?.email || '',
    soDienThoai: user?.soDienThoai || '',
    diaChi: user?.diaChi || '',
  });
  const [passwordForm, setPasswordForm] = useState({ matKhauCu: '', matKhauMoi: '', xacNhan: '' });
  const [changingPw, setChangingPw] = useState(false);

  if (!user) return null;

  const handleSave = () => {
    if (!form.hoTen || !form.email) {
      toast({ title: 'Lỗi', description: 'Họ tên và email không được để trống', variant: 'destructive' }); return;
    }
    const users = store.getUsers();
    const updated = users.map(u => u.maNguoiDung === user.maNguoiDung ? {
      ...u, hoTen: form.hoTen, email: form.email,
      soDienThoai: form.soDienThoai, diaChi: form.diaChi,
      ngayCapNhat: new Date().toISOString()
    } : u);
    store.setUsers(updated);
    localStorage.setItem('kho_currentUser', JSON.stringify({ ...user, ...form, ngayCapNhat: new Date().toISOString() }));
    setEditing(false);
    toast({ title: 'Thành công', description: 'Đã cập nhật thông tin cá nhân' });
  };

  const handleChangePassword = () => {
    if (passwordForm.matKhauCu !== user.matKhau) {
      toast({ title: 'Lỗi', description: 'Mật khẩu cũ không đúng', variant: 'destructive' }); return;
    }
    if (passwordForm.matKhauMoi.length < 6) {
      toast({ title: 'Lỗi', description: 'Mật khẩu mới phải ít nhất 6 ký tự', variant: 'destructive' }); return;
    }
    if (passwordForm.matKhauMoi !== passwordForm.xacNhan) {
      toast({ title: 'Lỗi', description: 'Mật khẩu xác nhận không khớp', variant: 'destructive' }); return;
    }
    const users = store.getUsers();
    const updated = users.map(u => u.maNguoiDung === user.maNguoiDung ? { ...u, matKhau: passwordForm.matKhauMoi, ngayCapNhat: new Date().toISOString() } : u);
    store.setUsers(updated);
    localStorage.setItem('kho_currentUser', JSON.stringify({ ...user, matKhau: passwordForm.matKhauMoi }));
    setChangingPw(false);
    setPasswordForm({ matKhauCu: '', matKhauMoi: '', xacNhan: '' });
    toast({ title: 'Thành công', description: 'Đã đổi mật khẩu' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {user.hoTen.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-xl">{user.hoTen}</CardTitle>
              <p className="text-sm text-muted-foreground">{ROLE_LABELS[user.vaiTro]}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-3">
              <div><Label>Họ tên</Label><Input value={form.hoTen} onChange={e => setForm(f => ({ ...f, hoTen: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Số điện thoại</Label><Input value={form.soDienThoai} onChange={e => setForm(f => ({ ...f, soDienThoai: e.target.value }))} /></div>
              <div><Label>Địa chỉ</Label><Input value={form.diaChi} onChange={e => setForm(f => ({ ...f, diaChi: e.target.value }))} /></div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="gradient-primary text-primary-foreground"><Save className="w-4 h-4 mr-1" /> Lưu</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Hủy</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-2 border-b">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-28">Mã NV:</span>
                <span className="text-sm font-medium font-mono">{user.maNguoiDung}</span>
              </div>
              <div className="flex items-center gap-3 py-2 border-b">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-28">Email:</span>
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 py-2 border-b">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-28">Vai trò:</span>
                <span className="text-sm">{ROLE_LABELS[user.vaiTro]}</span>
              </div>
              <div className="flex items-center gap-3 py-2 border-b">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-28">SĐT:</span>
                <span className="text-sm">{user.soDienThoai || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-3 py-2 border-b">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-28">Địa chỉ:</span>
                <span className="text-sm">{user.diaChi || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-3 py-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-28">Ngày tạo:</span>
                <span className="text-sm">{user.ngayTao}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(true)}>Chỉnh sửa thông tin</Button>
                <Button variant="outline" onClick={() => setChangingPw(true)}><KeyRound className="w-4 h-4 mr-1" /> Đổi mật khẩu</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {changingPw && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Đổi mật khẩu</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Mật khẩu cũ</Label><Input type="password" value={passwordForm.matKhauCu} onChange={e => setPasswordForm(f => ({ ...f, matKhauCu: e.target.value }))} /></div>
            <div><Label>Mật khẩu mới</Label><Input type="password" value={passwordForm.matKhauMoi} onChange={e => setPasswordForm(f => ({ ...f, matKhauMoi: e.target.value }))} /></div>
            <div><Label>Xác nhận mật khẩu mới</Label><Input type="password" value={passwordForm.xacNhan} onChange={e => setPasswordForm(f => ({ ...f, xacNhan: e.target.value }))} /></div>
            <div className="flex gap-2">
              <Button onClick={handleChangePassword} className="gradient-primary text-primary-foreground">Đổi mật khẩu</Button>
              <Button variant="outline" onClick={() => setChangingPw(false)}>Hủy</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
