import { useState, useMemo } from 'react';
import { store } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Package, FileInput, FileOutput, PackagePlus, Trash2, Pencil, X, Eye, Plus, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { apiCreateEquipment, apiUpdateEquipment, apiDeleteEquipment } from '@/lib/apiSync';
import { ThietBi } from '@/types';
import ImportsPage from './ImportsPage';
import ExportsPage from './ExportsPage';


function StockView({ onRefresh }: { onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const inventory = store.getInventory();
  const equipment = store.getEquipment();
  const suppliers = store.getSuppliers();

  const [form, setForm] = useState({
    tenThietBi: '', loaiThietBi: '', donViTinh: '', moTa: '', maNhaCungCap: '', hinhAnh: '', trangThai: true
  });

  const data = useMemo(() =>
    inventory.map(inv => ({
      ...inv,
      thietBi: equipment.find(e => e.maThietBi === inv.maThietBi),
    })).filter(d => {
      const matchSearch = d.thietBi?.tenThietBi.toLowerCase().includes(search.toLowerCase()) ||
                          d.maThietBi.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      
      if (filterStatus === 'TRONG_KHO') return d.soLuongKho > 0;
      if (filterStatus === 'DANG_DUNG') return d.soLuongDangDung > 0;
      if (filterStatus === 'HU_HONG') return d.soLuongHu > 0;
      if (filterStatus === 'HET_HANG') return (d.soLuongKho === 0 && d.soLuongDangDung === 0 && d.soLuongHu === 0);
      
      return true;
    }), [inventory, equipment, search, filterStatus]);

  const openAdd = () => {
    setSelectedItem(null);
    setForm({ tenThietBi: '', loaiThietBi: '', donViTinh: '', moTa: '', maNhaCungCap: '', hinhAnh: '', trangThai: true });
    setEditOpen(true);
  };

  const openEdit = (tb: ThietBi) => {
    setSelectedItem(tb);
    setForm({
      tenThietBi: tb.tenThietBi, loaiThietBi: tb.loaiThietBi, donViTinh: tb.donViTinh || '',
      moTa: tb.moTa || '', maNhaCungCap: tb.maNhaCungCap || '', hinhAnh: tb.hinhAnh || '', trangThai: tb.trangThai
    });
    setEditOpen(true);
    setDetailOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, hinhAnh: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!form.tenThietBi || !form.loaiThietBi) {
      toast({ title: 'Lỗi', description: 'Nhập đầy đủ thông tin', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      let res;
      if (selectedItem) res = await apiUpdateEquipment(selectedItem.maThietBi, form);
      else res = await apiCreateEquipment(form as any);
      
      if (res.success) {
        toast({ title: 'Thành công', description: selectedItem ? 'Đã cập nhật' : 'Đã thêm mới' });
        setEditOpen(false);
        onRefresh();
      } else toast({ title: 'Lỗi', description: res.message, variant: 'destructive' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (maThietBi: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const inv = inventory.find(i => i.maThietBi === maThietBi);
    if (inv && (inv.soLuongKho > 0 || inv.soLuongDangDung > 0)) {
      toast({ title: 'Lỗi', description: 'Thiết bị đang có tồn kho, không thể xóa.', variant: 'destructive' }); return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) return;
    try {
      const res = await apiDeleteEquipment(maThietBi);
      if (res.success) {
        toast({ title: 'Đã xóa' });
        onRefresh();
      }
      else toast({ title: 'Lỗi', description: res.message, variant: 'destructive' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Tìm tên, mã thiết bị..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-full" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Lọc thiết bị" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả thiết bị</SelectItem>
              <SelectItem value="TRONG_KHO">Đang có trong kho</SelectItem>
              <SelectItem value="DANG_DUNG">Đang được sử dụng</SelectItem>
              <SelectItem value="HU_HONG">Có thiết bị hư hỏng</SelectItem>
              <SelectItem value="HET_HANG">Đã hết sạch hàng</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-medium text-muted-foreground">Thiết bị</th>
              <th className="text-center p-4 font-medium text-muted-foreground">Trong kho</th>
              <th className="text-center p-4 font-medium text-muted-foreground">Đang dùng</th>
              <th className="text-center p-4 font-medium text-muted-foreground">Hư hỏng</th>
              <th className="text-center p-4 font-medium text-muted-foreground">Tổng cộng</th>
              <th className="text-center p-4 font-medium text-muted-foreground">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map(d => (
              <tr 
                key={d.maTonKho} 
                className="hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => { setSelectedItem(d.thietBi); setDetailOpen(true); }}
              >
                <td className="p-4">
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">{d.thietBi?.tenThietBi || 'Thiết bị không xác định'}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">{d.maThietBi}</div>
                </td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold">
                    {d.soLuongKho}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-md bg-secondary/10 text-secondary-foreground font-semibold">
                    {d.soLuongDangDung}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-md bg-warning/10 text-warning font-semibold">
                    {d.soLuongHu}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className="text-base font-bold text-foreground">
                    {d.soLuongKho + d.soLuongDangDung + d.soLuongHu}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDelete(d.maThietBi, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chi tiết thiết bị</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-2">
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                {selectedItem.hinhAnh ? (
                  <img src={selectedItem.hinhAnh} alt={selectedItem.tenThietBi} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Tên thiết bị:</span>
                  <span className="font-semibold">{selectedItem.tenThietBi}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Loại:</span>
                  <span>{selectedItem.loaiThietBi}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Nhà cung cấp:</span>
                  <span>{suppliers.find(s => s.maNhaCungCap === selectedItem.maNhaCungCap)?.tenNhaCungCap || '—'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <span className={selectedItem.trangThai ? 'text-success font-medium' : 'text-destructive font-medium'}>
                    {selectedItem.trangThai ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-muted-foreground block mb-1">Mô tả chức năng:</span>
                  <p className="text-foreground leading-relaxed italic">{selectedItem.moTa || 'Chưa có mô tả'}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button className="flex-1 gradient-primary text-white" onClick={() => openEdit(selectedItem)}>
                  <Pencil className="w-4 h-4 mr-2" /> Sửa thông tin
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setDetailOpen(false)}>Thoát</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Add Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedItem ? 'Sửa thiết bị' : 'Thêm thiết bị mới'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
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
              <div><Label>Đơn vị tính</Label><Input value={form.donViTinh} onChange={e => setForm(f => ({ ...f, donViTinh: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nhà cung cấp</Label>
                <Select value={form.maNhaCungCap} onValueChange={v => setForm(f => ({ ...f, maNhaCungCap: v }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.maNhaCungCap} value={s.maNhaCungCap}>{s.tenNhaCungCap}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trạng thái</Label>
                <Select value={form.trangThai ? 'TRUE' : 'FALSE'} onValueChange={v => setForm(f => ({ ...f, trangThai: v === 'TRUE' }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRUE">Đang sử dụng</SelectItem>
                    <SelectItem value="FALSE">Ngừng sử dụng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Mô tả chức năng</Label><Textarea value={form.moTa} onChange={e => setForm(f => ({ ...f, moTa: e.target.value }))} /></div>
            <div>
              <Label>Hình ảnh</Label>
              <div className="flex items-center gap-4 mt-1">
                {form.hinhAnh && <div className="w-16 h-16 rounded border overflow-hidden"><img src={form.hinhAnh} className="w-full h-full object-cover" /></div>}
                <Input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {data.length === 0 && (
        <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Không tìm thấy dữ liệu tồn kho phù hợp</p>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div key={refreshKey} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Quản lý kho</h1>
        <p className="text-muted-foreground">Theo dõi tồn kho, quản lý nhập xuất và thiết bị.</p>
      </div>

      <Tabs defaultValue="stock" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:max-w-2xl bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="stock" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Package className="w-4 h-4 mr-2" />
            Tồn kho
          </TabsTrigger>
          <TabsTrigger value="imports" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileInput className="w-4 h-4 mr-2" />
            Nhập kho
          </TabsTrigger>
          <TabsTrigger value="exports" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileOutput className="w-4 h-4 mr-2" />
            Xuất kho
          </TabsTrigger>

        </TabsList>

        <TabsContent value="stock" className="outline-none">
          <StockView onRefresh={triggerRefresh} />
        </TabsContent>
        
        <TabsContent value="imports" className="outline-none">
          <ImportsPage />
        </TabsContent>

        <TabsContent value="exports" className="outline-none">
          <ExportsPage />
        </TabsContent>


      </Tabs>
    </div>
  );
}
