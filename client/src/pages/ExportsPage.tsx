import { useState, Fragment, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateExport, apiConfirmExport, apiDeleteExport } from '@/lib/apiSync';
import '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Check, X, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const STATUS_MAP = { DA_LAP: 'Đã lập', DA_XUAT: 'Đã xuất', DA_HUY: 'Đã hủy' };
const STATUS_COLORS = { DA_LAP: 'bg-warning/10 text-warning', DA_XUAT: 'bg-success/10 text-success', DA_HUY: 'bg-destructive/10 text-destructive' };

export default function ExportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getExports());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [equipSearch, setEquipSearch] = useState('');
  const [cart, setCart] = useState<{maThietBi: string, soLuong: number}[]>([]);
  const [form, setForm] = useState({ ghiChu: '', lyDoXuat: '' });
  
  const equipment = store.getEquipment();
  const inventory = store.getInventory();
  
  const canCreate = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';
  const canCancel = user?.vaiTro === 'ADMIN';
  const canAdminDelete = user?.vaiTro === 'ADMIN';

  const inventoryAvailable = useMemo(() => {
    return inventory.filter(i => i.soLuongKho > 0).map(i => {
      const tb = equipment.find(e => e.maThietBi === i.maThietBi);
      return { ...i, tenThietBi: tb?.tenThietBi || i.maThietBi, loaiThietBi: tb?.loaiThietBi, donViTinh: tb?.donViTinh };
    }).filter(i => i.tenThietBi.toLowerCase().includes(equipSearch.toLowerCase()));
  }, [inventory, equipment, equipSearch]);

  const getMaxExport = (maThietBi: string) => {
    const inv = inventory.find(i => i.maThietBi === maThietBi);
    return inv ? inv.soLuongKho : 0;
  };

  const addToCart = (maThietBi: string) => {
    setCart(prev => {
      if (prev.find(p => p.maThietBi === maThietBi)) return prev;
      return [...prev, { maThietBi, soLuong: 1 }];
    });
  };

  const updateCart = (maThietBi: string, soLuong: number) => {
    setCart(prev => prev.map(p => p.maThietBi === maThietBi ? { ...p, soLuong } : p));
  };
  
  const removeCart = (maThietBi: string) => {
    setCart(prev => prev.filter(p => p.maThietBi !== maThietBi));
  };

  const handleCreate = async () => {
    if (!form.lyDoXuat) { toast({ title: 'Lỗi', description: 'Nhập lý do xuất', variant: 'destructive' }); return; }
    if (cart.length === 0) { toast({ title: 'Lỗi', description: 'Chưa chọn thiết bị nào', variant: 'destructive' }); return; }

    for(const item of cart) {
       const maxQty = getMaxExport(item.maThietBi);
       if(item.soLuong < 1 || item.soLuong > maxQty) {
          toast({ title: 'Lỗi số lượng', description: `Số lượng xuất không hợp lệ cho thiết bị ${item.maThietBi}`, variant: 'destructive' }); return;
       }
    }

    try {
      const result = await apiCreateExport({
        lyDoXuat: form.lyDoXuat, 
        maNhanVienKho: user!.maNguoiDung, 
        ghiChu: form.ghiChu,
        chiTiet: cart
      });
      if (result.success) {
        setData(store.getExports());
        setDialogOpen(false);
        toast({ title: 'Thành công', description: 'Đã lập phiếu xuất kho' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleConfirm = async (maPhieu: string) => {
    try {
      const result = await apiConfirmExport(maPhieu);
      if (result.success) {
        setData(store.getExports());
        toast({ title: 'Đã xác nhận xuất kho (ra khỏi bệnh viện)' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleCancel = async (maPhieu: string) => {
    const updated = data.map(d => d.maPhieu === maPhieu ? { ...d, trangThai: 'DA_HUY' as const } : d);
    store.setExports(updated); setData(updated);
    toast({ title: 'Đã hủy phiếu xuất' });
  };

  const handleDelete = async (maPhieu: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu xuất này không? Hành động này sẽ xóa vĩnh viễn dữ liệu.')) return;
    try {
      const result = await apiDeleteExport(maPhieu);
      if (result.success) {
        setData(store.getExports());
        toast({ title: 'Đã xóa', description: `Đã xóa phiếu xuất ${maPhieu}` });
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
          <Input placeholder="Tìm phiếu xuất..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canCreate && <Button onClick={() => { 
          setForm({ ghiChu: '', lyDoXuat: '' }); 
          setEquipSearch('');
          setCart([]);
          setDialogOpen(true); 
        }} className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Chọn thiết bị xuất kho</Button>}
      </div>

      <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
        <strong>Lưu ý:</strong> Xuất kho là xuất ra khỏi bệnh viện. Thiết bị sẽ bị trừ khỏi tổng tồn kho (kho + hư hỏng).
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-card rounded-lg border shadow-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã phiếu</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Lý do xuất</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Tổng SL</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Ngày</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
            {canAdminDelete && <th className="text-right p-3 font-medium text-muted-foreground">Xóa</th>}
          </tr></thead>
          <tbody>
            {data.filter(d => d.maPhieu.toLowerCase().includes(search.toLowerCase())).map(d => (
              <Fragment key={d.maPhieu}>
                <tr 
                  className={`border-b hover:bg-muted/30 cursor-pointer transition-colors ${expandedId === d.maPhieu ? 'bg-muted/50' : ''}`}
                  onClick={() => setExpandedId(expandedId === d.maPhieu ? null : d.maPhieu)}
                >
                  <td className="p-3 font-mono text-xs text-primary font-medium">{d.maPhieu}</td>
                  <td className="p-3 text-sm truncate max-w-[200px]">{d.lyDoXuat || '-'}</td>
                  <td className="p-3 text-center font-medium">{d.soLuong}</td>
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[d.trangThai]}`}>{STATUS_MAP[d.trangThai]}</span></td>
                  <td className="p-3 text-xs text-muted-foreground">{d.ngayXuat.slice(0, 10)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      {canCreate && d.trangThai === 'DA_LAP' && (
                        <Button variant="ghost" size="sm" className="text-success hover:bg-success/20" onClick={(e) => { e.stopPropagation(); handleConfirm(d.maPhieu); }}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Xác nhận
                        </Button>
                      )}
                      {canCancel && d.trangThai === 'DA_LAP' && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/20" onClick={(e) => { e.stopPropagation(); handleCancel(d.maPhieu); }}>
                          <X className="w-3.5 h-3.5 mr-1" /> Hủy
                        </Button>
                      )}
                    </div>
                  </td>
                  {canAdminDelete && (
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDelete(d.maPhieu); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </tr>
                {expandedId === d.maPhieu && (
                  <tr className="bg-muted/20">
                    <td colSpan={canAdminDelete ? 8 : 7} className="p-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-background/50 p-4 rounded-lg border border-border/50 shadow-sm">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                Lý do xuất kho
                              </h4>
                              <div className="text-sm bg-muted/30 p-3 rounded border border-border/50 min-h-[60px] whitespace-pre-wrap break-words">
                                {d.lyDoXuat || <span className="text-muted-foreground italic">(Không có lý do chi tiết)</span>}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Ghi chú bổ sung
                              </h4>
                              <div className="text-sm bg-muted/30 p-3 rounded border border-border/50 min-h-[60px] whitespace-pre-wrap break-words">
                                {d.ghiChu || <span className="text-muted-foreground italic">(Không có ghi chú)</span>}
                              </div>
                            </div>
                         </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <div className="text-center py-12 text-muted-foreground">Chưa có phiếu xuất kho</div>}

      {/* DIALOG CHỌN THIẾT BỊ XUẤT KHO */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Lập phiếu xuất kho đa thiết bị</DialogTitle></DialogHeader>
          
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            
            {/* Lựa chọn thiết bị */}
            <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/20">
               <div className="p-3 border-b bg-muted/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Tìm tên/mã thiết bị trong kho..." value={equipSearch} onChange={e => setEquipSearch(e.target.value)} className="pl-10" />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-2">
                 {inventoryAvailable.map(inv => (
                    <Card key={inv.maThietBi} className="hover:border-primary/50 transition-colors shadow-sm">
                      <CardContent className="p-3 flex justify-between items-center">
                         <div>
                            <p className="font-semibold text-sm line-clamp-1">{inv.tenThietBi}</p>
                            <p className="text-xs text-muted-foreground font-mono">{inv.maThietBi}</p>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="text-xs bg-muted px-2 py-1 rounded font-medium">Kho: {inv.soLuongKho}</span>
                            <Button size="sm" variant="outline" onClick={() => addToCart(inv.maThietBi)}>Chọn</Button>
                         </div>
                      </CardContent>
                    </Card>
                 ))}
                 {inventoryAvailable.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">Không tìm thấy thiết bị</div>}
               </div>
            </div>

            {/* Giỏ xuất kho */}
            <div className="flex flex-col border rounded-lg bg-card">
               <div className="p-3 border-b font-medium flex justify-between items-center">
                  <span>Thiết bị chuẩn bị Xuất</span>
                  <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">{cart.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto p-3 ">
                 <div className="space-y-3">
                   {cart.map(c => {
                     const tb = equipment.find(e => e.maThietBi === c.maThietBi);
                     const max = getMaxExport(c.maThietBi);
                     return (
                       <div key={c.maThietBi} className="flex flex-col sm:flex-row gap-3 p-3 border rounded items-start sm:items-center bg-muted/10">
                          <div className="flex-1">
                             <p className="font-medium text-sm line-clamp-1">{tb?.tenThietBi}</p>
                             <p className="text-xs text-muted-foreground">Kho: {max} {tb?.donViTinh}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Input 
                               type="number" min={1} max={max} 
                               value={c.soLuong} 
                               onChange={e => updateCart(c.maThietBi, parseInt(e.target.value)||1)} 
                               className="w-20 h-8"
                             />
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCart(c.maThietBi)}>
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                       </div>
                     )
                   })}
                   {cart.length===0 && <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">Chưa chọn thiết bị nào</div>}
                 </div>

                 <div className="mt-8 space-y-4">
                    <div>
                      <Label className="text-xs font-semibold">Lý do xuất *</Label>
                      <Textarea placeholder="VD: Hết hạn, hỏng hóc cần thanh lý..." value={form.lyDoXuat} className="mt-1 h-20" onChange={e => setForm(f => ({ ...f, lyDoXuat: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Ghi chú (Tùy chọn)</Label>
                      <Input value={form.ghiChu} className="mt-1" onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))} />
                    </div>
                 </div>
               </div>
            </div>
            
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Đóng</Button>
            <Button onClick={handleCreate} disabled={cart.length === 0} className="gradient-primary text-primary-foreground min-w-[120px]">Xuất Kho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
