import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateEquipment, apiUpdateEquipment, apiDeleteEquipment } from '@/lib/apiSync';
import { ThietBi } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Eye, Image as ImageIcon, X } from 'lucide-react';

export default function EquipmentPage() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState(store.getEquipment());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [imageViewOpen, setImageViewOpen] = useState(false);
  const [editing, setEditing] = useState<ThietBi | null>(null);
  const [viewing, setViewing] = useState<ThietBi | null>(null);
  const [saving, setSaving] = useState(false);
  const suppliers = store.getSuppliers();
  const inventory = store.getInventory();   

  const canEdit = user?.vaiTro === 'ADMIN';

  const [form, setForm] = useState({
    tenThietBi: '', loaiThietBi: '', donViTinh: '', moTa: '', maNhaCungCap: '', hinhAnh: ''
  });

  const filtered = useMemo(() =>
    equipment.filter(e =>
      e.tenThietBi.toLowerCase().includes(search.toLowerCase()) ||
      e.maThietBi.toLowerCase().includes(search.toLowerCase()) ||
      (e.loaiThietBi || '').toLowerCase().includes(search.toLowerCase())
    ), [equipment, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ tenThietBi: '', loaiThietBi: '', donViTinh: '', moTa: '', maNhaCungCap: '', hinhAnh: '' });
    setDialogOpen(true);
  };

  const openEdit = (tb: ThietBi) => {
    setEditing(tb);
    setForm({
      tenThietBi: tb.tenThietBi, loaiThietBi: tb.loaiThietBi, donViTinh: tb.donViTinh,
      moTa: tb.moTa, maNhaCungCap: tb.maNhaCungCap, hinhAnh: tb.hinhAnh || ''
    });
    setDialogOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Lỗi', description: 'Hình ảnh quá lớn (tối đa 5MB)', variant: 'destructive' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, hinhAnh: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!form.tenThietBi || !form.loaiThietBi || !form.donViTinh) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập đầy đủ thông tin bắt buộc', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        // Update existing equipment via API
        const result = await apiUpdateEquipment(editing.maThietBi, form);
        if (!result.success) {
          toast({ title: 'Lỗi', description: result.message || 'Cập nhật thất bại', variant: 'destructive' });
          return;
        }
        toast({ title: 'Thành công', description: 'Đã cập nhật thiết bị' });
      } else {
        // Create new equipment via API
        const result = await apiCreateEquipment(form);
        if (!result.success) {
          toast({ title: 'Lỗi', description: result.message || 'Thêm mới thất bại', variant: 'destructive' });
          return;
        }
        toast({ title: 'Thành công', description: `Đã thêm thiết bị mới` });
      }
      setEquipment(store.getEquipment());
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Lỗi', description: 'Không thể kết nối máy chủ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tb: ThietBi) => {
    const inv = inventory.find(i => i.maThietBi === tb.maThietBi);
    if (inv && (inv.soLuongDangDung > 0 || inv.soLuongKho > 0)) {
      toast({ title: 'Không thể xóa', description: 'Thiết bị đang được sử dụng hoặc còn tồn kho', variant: 'destructive' });
      return;
    }
    try {
      const result = await apiDeleteEquipment(tb.maThietBi);
      if (!result.success) {
        toast({ title: 'Không thể xóa', description: result.message || 'Thao tác thất bại', variant: 'destructive' });
        return;
      }
      setEquipment(store.getEquipment());
      toast({ title: 'Đã xóa', description: `Thiết bị ${tb.maThietBi} đã được xóa` });
    } catch (err) {
      toast({ title: 'Lỗi', description: 'Không thể kết nối máy chủ', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm thiết bị..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canEdit && (
          <Button onClick={openAdd} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Thêm thiết bị
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(tb => {
          const ncc = suppliers.find(s => s.maNhaCungCap === tb.maNhaCungCap);
          const inv = inventory.find(i => i.maThietBi === tb.maThietBi);
          return (
            <Card key={tb.maThietBi} className={`shadow-card hover:shadow-card-hover transition-all ${!tb.trangThai ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                {tb.hinhAnh ? (
                  <div
                    className="w-full h-40 rounded-lg mb-3 bg-muted overflow-hidden cursor-pointer"
                    onClick={() => { setViewing(tb); setImageViewOpen(true); }}
                  >
                    <img src={tb.hinhAnh} alt={tb.tenThietBi} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-lg mb-3 bg-muted flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{tb.tenThietBi}</p>
                    <p className="text-xs text-muted-foreground">{tb.maThietBi}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{tb.loaiThietBi}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">ĐVT: {tb.donViTinh}</p>
                {ncc && <p className="text-xs text-muted-foreground mb-1">NCC: {ncc.tenNhaCungCap}</p>}
                {!tb.trangThai && (
                  <span className="text-xs px-2 py-0.5 rounded bg-destructive/10 text-destructive">Ngừng sử dụng</span>
                )}
                {inv && (
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">Kho: {inv.soLuongKho}</span>
                    <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">Dùng: {inv.soLuongDangDung}</span>
                    <span className="px-2 py-0.5 rounded bg-warning/10 text-warning">Hư: {inv.soLuongHu}</span>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => { setViewing(tb); setViewOpen(true); }}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Xem
                  </Button>
                  {canEdit && (
                    <>
                      {tb.trangThai && (
                        <Button variant="outline" size="sm" onClick={() => openEdit(tb)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Sửa
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(tb)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Không tìm thấy thiết bị nào</div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên thiết bị *</Label><Input value={form.tenThietBi} onChange={e => setForm(f => ({ ...f, tenThietBi: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Loại thiết bị *</Label>
                <Select value={form.loaiThietBi} onValueChange={v => setForm(f => ({ ...f, loaiThietBi: v }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Máy móc">Máy móc</SelectItem>
                    <SelectItem value="Dụng cụ">Dụng cụ</SelectItem>
                    <SelectItem value="Vật tư">Vật tư</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Đơn vị tính *</Label><Input value={form.donViTinh} onChange={e => setForm(f => ({ ...f, donViTinh: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Nhà cung cấp</Label>
              <Select value={form.maNhaCungCap} onValueChange={v => setForm(f => ({ ...f, maNhaCungCap: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.trangThai).map(s => (
                    <SelectItem key={s.maNhaCungCap} value={s.maNhaCungCap}>{s.tenNhaCungCap}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Mô tả</Label><Textarea value={form.moTa} onChange={e => setForm(f => ({ ...f, moTa: e.target.value }))} /></div>
            <div>
              <Label>Hình ảnh thiết bị</Label>
              <div className="mt-1">
                {form.hinhAnh ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                    <img src={form.hinhAnh} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground/70 text-background flex items-center justify-center"
                      onClick={() => setForm(f => ({ ...f, hinhAnh: '' }))}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Click để tải ảnh lên (tối đa 5MB)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground" disabled={saving}>
              {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Chi tiết thiết bị</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3">
              {viewing.hinhAnh && (
                <div className="w-full h-48 rounded-lg overflow-hidden bg-muted cursor-pointer" onClick={() => { setImageViewOpen(true); setViewOpen(false); }}>
                  <img src={viewing.hinhAnh} alt={viewing.tenThietBi} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Mã:</span> <strong>{viewing.maThietBi}</strong></div>
                <div><span className="text-muted-foreground">Tên:</span> <strong>{viewing.tenThietBi}</strong></div>
                <div><span className="text-muted-foreground">Loại:</span> {viewing.loaiThietBi}</div>
                <div><span className="text-muted-foreground">ĐVT:</span> {viewing.donViTinh}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Mô tả:</span> {viewing.moTa || '—'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">NCC:</span> {suppliers.find(s => s.maNhaCungCap === viewing.maNhaCungCap)?.tenNhaCungCap || '—'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Trạng thái:</span> {viewing.trangThai ? 'Đang sử dụng' : 'Ngừng sử dụng'}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Full View */}
      <Dialog open={imageViewOpen} onOpenChange={setImageViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Hình ảnh thiết bị - {viewing?.tenThietBi}</DialogTitle></DialogHeader>
          {viewing?.hinhAnh && (
            <div className="w-full max-h-[70vh] overflow-auto rounded-lg">
              <img src={viewing.hinhAnh} alt={viewing.tenThietBi} className="w-full h-auto" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
