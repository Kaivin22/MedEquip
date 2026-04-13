import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateEquipment, apiUpdateEquipment, apiDeleteEquipment } from '@/lib/apiSync';
import { ThietBi, LOAI_THIET_BI_LABELS, LOAI_THIET_BI_COLORS } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Eye, Image as ImageIcon, X, AlertTriangle } from 'lucide-react';

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
  const [filterType, setFilterType] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  
  const suppliers = store.getSuppliers();
  const inventory = store.getInventory();

  const canEdit = user?.vaiTro === 'ADMIN' || user?.vaiTro === 'NV_KHO';

  const [form, setForm] = useState<{
    tenThietBi: string; loaiThietBi: 'VAT_TU_TIEU_HAO' | 'TAI_SU_DUNG'; donViTinh: string;
    heSoQuyDoi: number; serialNumber: string; nguongCanhBao: number;
    moTa: string; maNhaCungCap: string; hinhAnh: string;
  }>({
    tenThietBi: '', loaiThietBi: 'TAI_SU_DUNG', donViTinh: 'Cái',
    heSoQuyDoi: 1, serialNumber: '', nguongCanhBao: 10,
    moTa: '', maNhaCungCap: '', hinhAnh: ''
  });

  const filtered = useMemo(() => {
    let result = equipment.filter(e =>
      e.tenThietBi.toLowerCase().includes(search.toLowerCase()) ||
      e.maThietBi.toLowerCase().includes(search.toLowerCase())
    );

    if (filterType !== 'ALL') {
      result = result.filter(e => e.loaiThietBi === filterType);
    }

    result.sort((a, b) => {
      const invA = inventory.find(i => i.maThietBi === a.maThietBi)?.soLuongKho || 0;
      const invB = inventory.find(i => i.maThietBi === b.maThietBi)?.soLuongKho || 0;

      if (sortBy === 'NEWEST') return new Date(b.ngayTao).getTime() - new Date(a.ngayTao).getTime();
      if (sortBy === 'OLDEST') return new Date(a.ngayTao).getTime() - new Date(b.ngayTao).getTime();
      if (sortBy === 'STOCK_ASC') return invA - invB;
      if (sortBy === 'STOCK_DESC') return invB - invA;
      return 0;
    });

    return result;
  }, [equipment, search, filterType, sortBy, inventory]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      tenThietBi: '', loaiThietBi: 'TAI_SU_DUNG', donViTinh: 'Cái',
      heSoQuyDoi: 1, serialNumber: '', nguongCanhBao: 10,
      moTa: '', maNhaCungCap: '', hinhAnh: ''
    });
    setDialogOpen(true);
  };

  const openEdit = (tb: ThietBi) => {
    setEditing(tb);
    setForm({
      tenThietBi: tb.tenThietBi, loaiThietBi: tb.loaiThietBi, donViTinh: tb.donViTinh || '',
      heSoQuyDoi: tb.heSoQuyDoi || 1, serialNumber: tb.serialNumber || '', nguongCanhBao: tb.nguongCanhBao || 10,
      moTa: tb.moTa || '', maNhaCungCap: tb.maNhaCungCap || '', hinhAnh: tb.hinhAnh || ''
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
        const result = await apiUpdateEquipment(editing.maThietBi, form);
        if (!result.success) throw new Error(result.message);
        toast({ title: 'Thành công', description: 'Đã cập nhật thiết bị' });
      } else {
        const result = await apiCreateEquipment(form);
        if (!result.success) throw new Error(result.message);
        toast({ title: 'Thành công', description: `Đã thêm thiết bị mới` });
      }
      setEquipment(store.getEquipment());
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Không thể kết nối máy chủ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tb: ThietBi) => {
    const inv = inventory.find(i => i.maThietBi === tb.maThietBi);
    const totalStock = inv ? (inv.soLuongKho + inv.soLuongDangDung + inv.soLuongHu) : 0;
    
    if (totalStock > 0) {
      toast({ title: 'Không thể xóa', description: 'Không thể xóa vì thiết bị vẫn còn tồn trong hệ thống.', variant: 'destructive' });
      return;
    }
    
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thiết bị "${tb.tenThietBi}" không?`)) return;

    try {
      const result = await apiDeleteEquipment(tb.maThietBi);
      if (!result.success) throw new Error(result.message);
      setEquipment(store.getEquipment());
      toast({ title: 'Đã xóa', description: `Thiết bị ${tb.maThietBi} đã được xóa` });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Không thể kết nối máy chủ', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 w-full">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Tìm thiết bị..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 mr-2" />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Loại thiết bị" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="TAI_SU_DUNG">Tái sử dụng</SelectItem>
              <SelectItem value="VAT_TU_TIEU_HAO">Vật tư tiêu hao</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEWEST">Mới nhất</SelectItem>
              <SelectItem value="OLDEST">Cũ nhất</SelectItem>
              <SelectItem value="STOCK_DESC">Tồn kho ⬇</SelectItem>
              <SelectItem value="STOCK_ASC">Tồn kho ⬆</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canEdit && (
          <Button onClick={openAdd} className="gradient-primary text-primary-foreground min-w-[140px]">
            <Plus className="w-4 h-4 mr-2" /> Thêm thiết bị
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(tb => {
          const ncc = suppliers.find(s => s.maNhaCungCap === tb.maNhaCungCap);
          const inv = inventory.find(i => i.maThietBi === tb.maThietBi);
          const isLowStock = inv && (inv.soLuongKho < (tb.nguongCanhBao || 10));

          return (
            <Card key={tb.maThietBi} className={`shadow-card hover:shadow-card-hover transition-all ${!tb.trangThai ? 'opacity-60' : ''} ${isLowStock ? 'border-destructive/50 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : ''}`}>
              <CardContent className="p-4 flex flex-col h-full">
                {tb.hinhAnh ? (
                  <div
                    className="w-full h-40 rounded-lg mb-3 bg-muted overflow-hidden cursor-pointer relative group"
                    onClick={() => { setViewing(tb); setImageViewOpen(true); }}
                  >
                    <img src={tb.hinhAnh} alt={tb.tenThietBi} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-lg mb-3 bg-muted flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-foreground truncate" title={tb.tenThietBi}>{tb.tenThietBi}</p>
                      <p className="text-xs text-muted-foreground font-mono">{tb.maThietBi}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${LOAI_THIET_BI_COLORS[tb.loaiThietBi || 'TAI_SU_DUNG']}`}>
                      {LOAI_THIET_BI_LABELS[tb.loaiThietBi || 'TAI_SU_DUNG']}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <p className="text-xs text-muted-foreground">ĐVT: <span className="font-medium text-foreground">{tb.donViTinh}</span> (1 thùng = {tb.heSoQuyDoi || 1})</p>
                    {tb.loaiThietBi === 'TAI_SU_DUNG' && tb.serialNumber && (
                      <p className="text-xs text-muted-foreground">SN: <span className="font-mono text-foreground">{tb.serialNumber}</span></p>
                    )}
                    {ncc && <p className="text-xs text-muted-foreground truncate">NCC: {ncc.tenNhaCungCap}</p>}
                  </div>

                  {!tb.trangThai && (
                    <span className="text-xs px-2 py-0.5 rounded bg-destructive/10 text-destructive mb-2 inline-block">Ngừng sử dụng</span>
                  )}
                  
                  {inv && (
                    <div className="flex gap-2 text-xs mb-3">
                      <div className={`px-2 py-0.5 rounded flex items-center ${isLowStock ? 'bg-destructive/10 text-destructive font-medium border border-destructive/20' : 'bg-primary/10 text-primary'}`}>
                        {isLowStock && <AlertTriangle className="w-3 h-3 mr-1" />}
                        Kho: {inv.soLuongKho}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">Dùng: {inv.soLuongDangDung}</span>
                      {inv.soLuongHu > 0 && <span className="px-2 py-0.5 rounded bg-warning/10 text-warning">Hư: {inv.soLuongHu}</span>}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-auto pt-3 border-t">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setViewing(tb); setViewOpen(true); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  {canEdit && (
                    <>
                      {tb.trangThai && (
                        <Button variant="ghost" size="sm" className="flex-1 text-primary" onClick={() => openEdit(tb)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={() => handleDelete(tb)}>
                        <Trash2 className="w-4 h-4" />
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div><Label>Tên thiết bị *</Label><Input value={form.tenThietBi} onChange={e => setForm(f => ({ ...f, tenThietBi: e.target.value }))} /></div>
              
              <div>
                <Label>Loại thiết bị *</Label>
                <Select value={form.loaiThietBi} onValueChange={v => setForm(f => ({ ...f, loaiThietBi: v as any }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TAI_SU_DUNG">{LOAI_THIET_BI_LABELS['TAI_SU_DUNG']}</SelectItem>
                    <SelectItem value="VAT_TU_TIEU_HAO">{LOAI_THIET_BI_LABELS['VAT_TU_TIEU_HAO']}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Đơn vị tính *</Label><Input value={form.donViTinh} onChange={e => setForm(f => ({ ...f, donViTinh: e.target.value }))} /></div>
                <div><Label>Hệ số quy đổi</Label><Input type="number" min={1} value={form.heSoQuyDoi} onChange={e => setForm(f => ({ ...f, heSoQuyDoi: parseInt(e.target.value) || 1 }))} /></div>
              </div>

              {form.loaiThietBi === 'TAI_SU_DUNG' && (
                <div><Label>Serial Number</Label><Input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} /></div>
              )}

              <div><Label>Ngưỡng cảnh báo (tồn kho tối thiểu)</Label><Input type="number" min={0} value={form.nguongCanhBao} onChange={e => setForm(f => ({ ...f, nguongCanhBao: parseInt(e.target.value) || 0 }))} /></div>
            </div>

            <div className="space-y-3">
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
              <div><Label>Mô tả</Label><Textarea value={form.moTa} onChange={e => setForm(f => ({ ...f, moTa: e.target.value }))} className="h-20" /></div>
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
                      <span className="text-xs text-muted-foreground">Click để tải ảnh lên</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
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
            <div className="space-y-4">
              {viewing.hinhAnh && (
                <div className="w-full h-48 rounded-lg overflow-hidden bg-muted cursor-pointer" onClick={() => { setImageViewOpen(true); setViewOpen(false); }}>
                  <img src={viewing.hinhAnh} alt={viewing.tenThietBi} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div><span className="text-muted-foreground block text-xs">Mã thiết bị</span> <span className="font-mono font-medium">{viewing.maThietBi}</span></div>
                <div><span className="text-muted-foreground block text-xs">Tên thiết bị</span> <span className="font-semibold">{viewing.tenThietBi}</span></div>
                <div><span className="text-muted-foreground block text-xs">Phân loại</span> <span className={`px-2 py-0.5 rounded text-[10px] ${LOAI_THIET_BI_COLORS[viewing.loaiThietBi || 'TAI_SU_DUNG']}`}>{LOAI_THIET_BI_LABELS[viewing.loaiThietBi || 'TAI_SU_DUNG']}</span></div>
                <div><span className="text-muted-foreground block text-xs">Đơn vị tính</span> <span>{viewing.donViTinh}</span></div>
                <div><span className="text-muted-foreground block text-xs">Hệ số quy đổi</span> <span>1 thùng = {viewing.heSoQuyDoi || 1}</span></div>
                <div><span className="text-muted-foreground block text-xs">Mức cảnh báo tồn kho</span> <span>{viewing.nguongCanhBao || 10}</span></div>
                
                {viewing.loaiThietBi === 'TAI_SU_DUNG' && viewing.serialNumber && (
                  <div className="col-span-2"><span className="text-muted-foreground block text-xs">Serial Number</span> <span className="font-mono bg-muted px-2 py-0.5">{viewing.serialNumber}</span></div>
                )}
                
                <div className="col-span-2"><span className="text-muted-foreground block text-xs">Mô tả</span> <span className="text-muted-foreground">{viewing.moTa || 'Không có'}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground block text-xs">Nhà cung cấp</span> <span>{suppliers.find(s => s.maNhaCungCap === viewing.maNhaCungCap)?.tenNhaCungCap || '—'}</span></div>
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
