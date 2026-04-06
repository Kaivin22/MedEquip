import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateExport, apiConfirmExport } from '@/lib/apiSync';
import '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Check, X } from 'lucide-react';

const STATUS_MAP = { DA_LAP: 'Đã lập', DA_XUAT: 'Đã xuất', DA_HUY: 'Đã hủy' };
const STATUS_COLORS = { DA_LAP: 'bg-warning/10 text-warning', DA_XUAT: 'bg-success/10 text-success', DA_HUY: 'bg-destructive/10 text-destructive' };

export default function ExportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getExports());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const equipment = store.getEquipment();
  const canCreate = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';
  const canCancel = user?.vaiTro === 'ADMIN';

  const [form, setForm] = useState({ maThietBi: '', soLuong: 1, ghiChu: '', lyDoXuat: '' });

  const getMaxExport = (maThietBi: string) => {
    const inv = store.getInventory().find(i => i.maThietBi === maThietBi);
    return inv ? inv.soLuongKho : 0;
  };

  const handleCreate = async () => {
    if (!form.maThietBi || !form.lyDoXuat) { toast({ title: 'Lỗi', description: 'Nhập đầy đủ thông tin', variant: 'destructive' }); return; }
    if (form.soLuong < 1) { toast({ title: 'Lỗi', description: 'Số lượng phải lớn hơn 0', variant: 'destructive' }); return; }

    const maxQty = getMaxExport(form.maThietBi);
    if (form.soLuong > maxQty) {
      toast({ title: 'Lỗi', description: `Số lượng xuất không được vượt quá ${maxQty} (kho + hư hỏng)`, variant: 'destructive' }); return;
    }

    try {
      const result = await apiCreateExport({ maThietBi: form.maThietBi, soLuong: form.soLuong, lyDoXuat: form.lyDoXuat, maNhanVienKho: user!.maNguoiDung, ghiChu: form.ghiChu });
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm phiếu xuất..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canCreate && <Button onClick={() => { 
          setForm({ maThietBi: '', soLuong: 1, ghiChu: '', lyDoXuat: '' }); 
          setEquipmentSearch('');
          setShowSuggestions(false);
          setDialogOpen(true); 
        }} className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Lập phiếu xuất</Button>}
      </div>

      <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
        <strong>Lưu ý:</strong> Xuất kho là xuất ra khỏi bệnh viện. Thiết bị sẽ bị trừ khỏi tổng tồn kho (kho + hư hỏng).
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã phiếu</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Thiết bị</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Lý do xuất</th>
            <th className="text-center p-3 font-medium text-muted-foreground">SL</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Ngày</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
          </tr></thead>
          <tbody>
            {data.filter(d => d.maPhieu.toLowerCase().includes(search.toLowerCase())).map(d => (
              <tr key={d.maPhieu} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{d.maPhieu}</td>
                <td className="p-3">{(d as any).tenThietBi || equipment.find(e => e.maThietBi === d.maThietBi)?.tenThietBi}</td>
                <td className="p-3 text-sm">{d.lyDoXuat || '-'}</td>
                <td className="p-3 text-center font-medium">{d.soLuong}</td>
                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[d.trangThai]}`}>{STATUS_MAP[d.trangThai]}</span></td>
                <td className="p-3 text-xs text-muted-foreground">{d.ngayXuat.slice(0, 10)}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    {canCreate && d.trangThai === 'DA_LAP' && (
                      <Button variant="ghost" size="sm" className="text-success" onClick={() => handleConfirm(d.maPhieu)}><Check className="w-3.5 h-3.5 mr-1" /> Xác nhận</Button>
                    )}
                    {canCancel && d.trangThai === 'DA_LAP' && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleCancel(d.maPhieu)}><X className="w-3.5 h-3.5 mr-1" /> Hủy</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <div className="text-center py-12 text-muted-foreground">Chưa có phiếu xuất kho</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Lập phiếu xuất kho (ra khỏi bệnh viện)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Label>Tìm kiếm thiết bị *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Nhập tên hoặc mã thiết bị..." 
                  className="pl-10"
                  value={equipmentSearch}
                  onChange={e => {
                    setEquipmentSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
              </div>
              
              {showSuggestions && (equipmentSearch.length > 0 || equipment.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-200">
                  {equipment
                    .filter(e => e.trangThai && (
                      e.tenThietBi.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                      e.maThietBi.toLowerCase().includes(equipmentSearch.toLowerCase())
                    ))
                    .map(e => {
                      const max = getMaxExport(e.maThietBi);
                      return (
                        <div 
                          key={e.maThietBi}
                          className="flex justify-between items-center p-2 hover:bg-accent cursor-pointer border-b last:border-0"
                          onClick={() => {
                            setForm(f => ({ ...f, maThietBi: e.maThietBi }));
                            setEquipmentSearch(e.tenThietBi);
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{e.tenThietBi}</span>
                            <span className="text-xs text-muted-foreground">{e.maThietBi}</span>
                          </div>
                          <div className="text-xs font-semibold bg-muted px-2 py-1 rounded">
                            Kho: {max}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div>
              <Label>Lý do xuất *</Label>
              <Textarea placeholder="VD: Thiết bị hết hạn sử dụng, thanh lý, chuyển viện..." value={form.lyDoXuat} className="mt-1" onChange={e => setForm(f => ({ ...f, lyDoXuat: e.target.value }))} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Số lượng *</Label>
                <Input type="number" min={1} max={form.maThietBi ? getMaxExport(form.maThietBi) : undefined} value={form.soLuong} className="mt-1" onChange={e => {
                  const val = parseInt(e.target.value) || 0;
                  setForm(f => ({ ...f, soLuong: val < 0 ? 0 : val }));
                }} />
              </div>
              <div className="flex flex-col justify-end">
                {form.maThietBi && (
                  <div className="text-xs text-muted-foreground pb-2 italic">
                    Tối đa có thể xuất: {getMaxExport(form.maThietBi)}
                  </div>
                )}
              </div>
            </div>

            <div><Label>Ghi chú</Label><Textarea value={form.ghiChu} className="mt-1" onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={!form.maThietBi} className="gradient-primary text-primary-foreground">Lập phiếu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
