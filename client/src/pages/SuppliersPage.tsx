import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateSupplier, apiUpdateSupplier, apiDeleteSupplier, apiCreateEquipment, apiUpdateEquipment, apiDeleteEquipment } from '@/lib/apiSync';
import { NhaCungCap, ThietBi } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Eye, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';

export default function SuppliersPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getSuppliers());
  const [equipment, setEquipment] = useState(store.getEquipment());
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Supplier Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NhaCungCap | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<NhaCungCap | null>(null);
  
  // Equipment Dialog States (for expanded view)
  const [eqDialogOpen, setEqDialogOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<ThietBi | null>(null);
  const [eqSaving, setEqSaving] = useState(false);
  const [eqForm, setEqForm] = useState({
    tenThietBi: '', loaiThietBi: 'Máy móc', donViTinh: 'Cái', moTa: '', hinhAnh: '', maNhaCungCap: ''
  });

  const canEdit = user?.vaiTro === 'ADMIN';

  const [form, setForm] = useState({ tenNhaCungCap: '', diaChi: '', soDienThoai: '', email: '' });

  const filtered = useMemo(() =>
    data.filter(s => s.tenNhaCungCap.toLowerCase().includes(search.toLowerCase()) || s.maNhaCungCap.toLowerCase().includes(search.toLowerCase())), [data, search]);

  const reloadData = () => {
    setData(store.getSuppliers());
    setEquipment(store.getEquipment());
  };

  const openAdd = () => { setEditing(null); setForm({ tenNhaCungCap: '', diaChi: '', soDienThoai: '', email: '' }); setDialogOpen(true); };
  const openEdit = (s: NhaCungCap) => { setEditing(s); setForm({ tenNhaCungCap: s.tenNhaCungCap, diaChi: s.diaChi, soDienThoai: s.soDienThoai, email: s.email }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.tenNhaCungCap) { toast({ title: 'Lỗi', description: 'Vui lòng nhập tên nhà cung cấp', variant: 'destructive' }); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: 'Lỗi', description: 'Email không hợp lệ', variant: 'destructive' }); return;
    }
    if (form.soDienThoai && !/^\d+$/.test(form.soDienThoai)) {
      toast({ title: 'Lỗi', description: 'Số điện thoại không hợp lệ (chỉ được chứa số)', variant: 'destructive' }); return;
    }

    try {
      let res;
      if (editing) {
        res = await apiUpdateSupplier(editing.maNhaCungCap, form);
      } else {
        res = await apiCreateSupplier(form);
      }

      if (res && res.success === false) {
        toast({ title: 'Lỗi', description: res.message, variant: 'destructive' });
        return;
      }

      toast({ title: editing ? 'Cập nhật thành công' : 'Thêm thành công' });
      reloadData();
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const handleDelete = async (s: NhaCungCap) => {
    const eq = store.getEquipment().some(e => e.maNhaCungCap === s.maNhaCungCap);
    if (eq) { toast({ title: 'Không thể xóa', description: 'NCC đang có thiết bị liên kết', variant: 'destructive' }); return; }
    if (!window.confirm('Xóa nhà cung cấp này?')) return;
    
    try {
      const res = await apiDeleteSupplier(s.maNhaCungCap);
      if (res.success) {
        toast({ title: 'Đã xóa thành công' });
        reloadData();
      } else {
        toast({ title: 'Lỗi', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  // Equipment Logic
  const openAddEq = (maNCC: string) => {
    setEditingEq(null);
    setEqForm({ tenThietBi: '', loaiThietBi: 'Máy móc', donViTinh: 'Cái', moTa: '', hinhAnh: '', maNhaCungCap: maNCC });
    setEqDialogOpen(true);
  };

  const openEditEq = (tb: ThietBi) => {
    setEditingEq(tb);
    setEqForm({
      tenThietBi: tb.tenThietBi, loaiThietBi: tb.loaiThietBi, donViTinh: tb.donViTinh,
      moTa: tb.moTa || '', hinhAnh: tb.hinhAnh || '', maNhaCungCap: tb.maNhaCungCap || ''
    });
    setEqDialogOpen(true);
  };

  const handleSaveEq = async () => {
    if (!eqForm.tenThietBi) { toast({ title: 'Lỗi', description: 'Nhập tên thiết bị', variant: 'destructive' }); return; }
    setEqSaving(true);
    try {
      if (editingEq) await apiUpdateEquipment(editingEq.maThietBi, eqForm);
      else await apiCreateEquipment(eqForm as any);
      reloadData();
      setEqDialogOpen(false);
      toast({ title: 'Thành công' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally { setEqSaving(false); }
  };

  const handleDeleteEq = async (maThietBi: string) => {
    const inv = store.getInventory().find(i => i.maThietBi === maThietBi);
    if (inv && (inv.soLuongKho > 0 || inv.soLuongDangDung > 0 || inv.soLuongHu > 0)) {
      toast({ title: 'Lỗi', description: 'Thiết bị đang có tồn kho, không thể xóa.', variant: 'destructive' }); return;
    }
    if (!window.confirm('Xóa thiết bị này?')) return;
    await apiDeleteEquipment(maThietBi);
    reloadData();
    toast({ title: 'Đã xóa thiết bị' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setEqForm(f => ({ ...f, hinhAnh: reader.result as string }));
      reader.readAsDataURL(file);
    }
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

      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/30">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="w-10"></th>
            <th className="text-left p-4 font-medium text-muted-foreground">Mã</th>
            <th className="text-left p-4 font-medium text-muted-foreground">Tên NCC</th>
            <th className="text-left p-4 font-medium text-muted-foreground">Địa chỉ</th>
            <th className="text-left p-4 font-medium text-muted-foreground">SĐT</th>
            <th className="text-right p-4 font-medium text-muted-foreground">Thao tác</th>
          </tr></thead>
          <tbody>
            {filtered.map(s => (
              <React.Fragment key={s.maNhaCungCap}>
                <tr className={`border-b hover:bg-muted/20 transition-colors cursor-pointer ${expandedId === s.maNhaCungCap ? 'bg-muted/10' : ''}`} onClick={() => setExpandedId(expandedId === s.maNhaCungCap ? null : s.maNhaCungCap)}>
                  <td className="p-4 text-center">
                    {expandedId === s.maNhaCungCap ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{s.maNhaCungCap}</td>
                  <td className="p-4 font-semibold text-foreground">{s.tenNhaCungCap}</td>
                  <td className="p-4 text-muted-foreground max-w-xs truncate">{s.diaChi}</td>
                  <td className="p-4">{s.soDienThoai}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(s); setViewOpen(true); }}><Eye className="w-4 h-4" /></Button>
                      {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>}
                      {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s)}><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </td>
                </tr>
                {expandedId === s.maNhaCungCap && (
                  <tr>
                    <td colSpan={6} className="bg-muted/10 p-6">
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <h3 className="font-bold text-base flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" /> Danh sách sản phẩm của {s.tenNhaCungCap}
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {equipment.filter(e => e.maNhaCungCap === s.maNhaCungCap).length > 0 ? (
                            equipment.filter(e => e.maNhaCungCap === s.maNhaCungCap).map(e => (
                              <div key={e.maThietBi} className="bg-background rounded-lg border border-border/50 p-3 flex gap-3 group relative hover:shadow-md transition-shadow">
                                <div className="w-16 h-16 rounded border bg-muted flex-shrink-0 overflow-hidden">
                                  {e.hinhAnh ? <img src={e.hinhAnh} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-muted-foreground/30 m-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate">{e.tenThietBi}</div>
                                  <div className="text-xs text-muted-foreground">{e.loaiThietBi} • {e.donViTinh}</div>
                                  <div className="text-xs text-muted-foreground mt-1 font-mono">{e.maThietBi}</div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => openEditEq(e)}><Pencil className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteEq(e.maThietBi)}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full py-8 text-center text-muted-foreground italic">
                              Chưa có thiết bị nào từ nhà cung cấp này.
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Không tìm thấy nhà cung cấp phù hợp</div>}

      {/* Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>Tên NCC *</Label><Input value={form.tenNhaCungCap} onChange={e => setForm(f => ({ ...f, tenNhaCungCap: e.target.value }))} /></div>
            <div><Label>Địa chỉ</Label><Input value={form.diaChi} onChange={e => setForm(f => ({ ...f, diaChi: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SĐT</Label><Input value={form.soDienThoai} onChange={e => setForm(f => ({ ...f, soDienThoai: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} className="gradient-primary text-white">{editing ? 'Cập nhật' : 'Thêm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Equipment Dialog */}
      <Dialog open={eqDialogOpen} onOpenChange={setEqDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEq ? 'Sửa thiết bị' : 'Thêm thiết bị mới'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>Tên thiết bị *</Label><Input value={eqForm.tenThietBi} onChange={e => setEqForm(f => ({ ...f, tenThietBi: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Loại thiết bị</Label>
                <Select value={eqForm.loaiThietBi} onValueChange={v => setEqForm(f => ({ ...f, loaiThietBi: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Máy móc">Máy móc</SelectItem>
                    <SelectItem value="Dụng cụ">Dụng cụ</SelectItem>
                    <SelectItem value="Vật tư">Vật tư</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Đơn vị tính</Label><Input value={eqForm.donViTinh} onChange={e => setEqForm(f => ({ ...f, donViTinh: e.target.value }))} /></div>
            </div>
            <div><Label>Mô tả</Label><Textarea value={eqForm.moTa} onChange={e => setEqForm(f => ({ ...f, moTa: e.target.value }))} /></div>
            <div>
              <Label>Hình ảnh</Label>
              <div className="flex items-center gap-3 mt-1">
                <div className="w-12 h-12 rounded border overflow-hidden bg-muted flex-shrink-0">
                  {eqForm.hinhAnh ? <img src={eqForm.hinhAnh} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 m-3 text-muted-foreground/30" />}
                </div>
                <Input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEqDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveEq} disabled={eqSaving} className="gradient-primary text-white">{eqSaving ? 'Đang lưu...' : 'Lưu sản phẩm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chi tiết Nhà cung cấp</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm py-2">
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Mã định danh:</span> <strong>{viewing.maNhaCungCap}</strong></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Chi tiết tên:</span> <strong>{viewing.tenNhaCungCap}</strong></div>
              <div className="space-y-1"><span className="text-muted-foreground">Địa chỉ:</span> <p className="font-medium">{viewing.diaChi || '—'}</p></div>
              <div className="flex justify-between border-b pb-2 pt-2"><span className="text-muted-foreground">SĐT liên hệ:</span> <strong>{viewing.soDienThoai || '—'}</strong></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Email:</span> <strong>{viewing.email || '—'}</strong></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
