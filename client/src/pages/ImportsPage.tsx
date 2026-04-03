import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateImport, apiDeleteImport } from '@/lib/apiSync';
import '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Trash2, Check, X } from 'lucide-react';
import { fetchApi } from '@/services/api';
import { refreshData } from '@/lib/dataLoader';

const STATUS_MAP: Record<string, string> = {
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  TU_CHOI: 'Từ chối',
};
const STATUS_COLORS: Record<string, string> = {
  CHO_DUYET: 'bg-warning/10 text-warning',
  DA_DUYET: 'bg-success/10 text-success',
  TU_CHOI: 'bg-destructive/10 text-destructive',
};

export default function ImportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getImports());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const equipment = store.getEquipment();
  const suppliers = store.getSuppliers();
  const users = store.getUsers();
  const canCreate = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';
  const canDelete = user?.vaiTro === 'ADMIN';
  const canApprove = user?.vaiTro === 'ADMIN' || user?.vaiTro === 'TRUONG_KHOA';

  const [form, setForm] = useState({ maThietBi: '', maNhaCungCap: '', soLuongNhap: 1, ghiChu: '' });

  const reload = async () => {
    await refreshData('imports');
    await refreshData('inventory');
    setData(store.getImports());
  };

  const handleCreate = async () => {
    if (!form.maThietBi || !form.maNhaCungCap) {
      toast({ title: 'Lỗi', description: 'Nhập đầy đủ thông tin', variant: 'destructive' }); return;
    }
    if (form.soLuongNhap < 1) {
      toast({ title: 'Lỗi', description: 'Số lượng phải lớn hơn 0', variant: 'destructive' }); return;
    }
    try {
      const result = await apiCreateImport({ ...form, maNhanVienKho: user!.maNguoiDung });
      if (result.success) {
        await reload();
        setDialogOpen(false);
        toast({ title: 'Đã lập phiếu', description: 'Phiếu nhập kho đang CHỜ DUYỆT từ Trưởng khoa / Admin' });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi xảy ra', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const handleApprove = async (maPhieu: string) => {
    try {
      const result: any = await fetchApi(`/imports/${maPhieu}/approve`, { method: 'PUT', body: JSON.stringify({ approved: true }) });
      if (result.success) {
        await reload();
        toast({ title: 'Đã duyệt', description: 'Phiếu nhập kho đã được duyệt và tồn kho đã cập nhật' });
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const handleRejectOpen = (maPhieu: string) => {
    setRejectingId(maPhieu);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập lý do từ chối', variant: 'destructive' }); return;
    }
    try {
      const result: any = await fetchApi(`/imports/${rejectingId}/approve`, { method: 'PUT', body: JSON.stringify({ approved: false, lyDo: rejectReason }) });
      if (result.success) {
        await reload();
        setRejectDialogOpen(false);
        toast({ title: 'Đã từ chối', description: `Phiếu ${rejectingId} đã bị từ chối`, variant: 'destructive' });
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const handleDelete = async (maPhieu: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch sử này không?')) return;
    try {
      const result = await apiDeleteImport(maPhieu);
      if (result.success) {
        await reload();
        toast({ title: 'Đã xóa', description: `Đã xóa phiếu ${maPhieu}` });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi xảy ra', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const filtered = data.filter(d => d.maPhieu.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm phiếu nhập..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canCreate && <Button onClick={() => { setForm({ maThietBi: '', maNhaCungCap: '', soLuongNhap: 1, ghiChu: '' }); setDialogOpen(true); }} className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Lập phiếu nhập</Button>}
      </div>

      <div className="p-3 rounded-lg bg-info/10 border border-info/20 text-sm text-info">
        <strong>Lưu ý:</strong> Phiếu nhập kho cần được <strong>Trưởng khoa hoặc Admin </strong> phê duyệt trước khi tồn kho được cập nhật.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã phiếu</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Thiết bị</th>
            <th className="text-left p-3 font-medium text-muted-foreground">NCC</th>
            <th className="text-left p-3 font-medium text-muted-foreground">NV Kho</th>
            <th className="text-center p-3 font-medium text-muted-foreground">SL</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Ngày nhập</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
          </tr></thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.maPhieu} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{d.maPhieu}</td>
                <td className="p-3">{(d as any).tenThietBi || equipment.find(e => e.maThietBi === d.maThietBi)?.tenThietBi}</td>
                <td className="p-3">{suppliers.find(s => s.maNhaCungCap === d.maNhaCungCap)?.tenNhaCungCap}</td>
                <td className="p-3">{users.find(u => u.maNguoiDung === d.maNhanVienKho)?.hoTen}</td>
                <td className="p-3 text-center font-medium">{d.soLuongNhap}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[(d as any).trangThai || 'DA_DUYET']}`}>
                    {STATUS_MAP[(d as any).trangThai || 'DA_DUYET']}
                  </span>
                  {(d as any).trangThai === 'TU_CHOI' && (d as any).lyDoTuChoi && (
                    <p className="text-xs text-destructive mt-1">Lý do: {(d as any).lyDoTuChoi}</p>
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{d.ngayNhap.slice(0, 10)}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    {canApprove && (d as any).trangThai === 'CHO_DUYET' && (
                      <>
                        <Button size="sm" variant="ghost" className="text-success hover:text-success hover:bg-success/10" onClick={() => handleApprove(d.maPhieu)}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Duyệt
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRejectOpen(d.maPhieu)}>
                          <X className="w-3.5 h-3.5 mr-1" /> Từ chối
                        </Button>
                      </>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8" onClick={() => handleDelete(d.maPhieu)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <div className="text-center py-12 text-muted-foreground">Chưa có phiếu nhập kho</div>}

      {/* Dialog lập phiếu nhập */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lập phiếu nhập kho</DialogTitle></DialogHeader>
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
            ⚠️ Phiếu sẽ ở trạng thái <strong>Chờ duyệt</strong>. Tồn kho chỉ được cập nhật sau khi Trưởng khoa / Admin phê duyệt.
          </div>
          <div className="space-y-3">
            <div>
              <Label>Thiết bị *</Label>
              <Select value={form.maThietBi} onValueChange={v => setForm(f => ({ ...f, maThietBi: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn thiết bị" /></SelectTrigger>
                <SelectContent>{equipment.filter(e => e.trangThai).map(e => <SelectItem key={e.maThietBi} value={e.maThietBi}>{e.tenThietBi}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nhà cung cấp *</Label>
              <Select value={form.maNhaCungCap} onValueChange={v => setForm(f => ({ ...f, maNhaCungCap: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                <SelectContent>{suppliers.filter(s => s.trangThai).map(s => <SelectItem key={s.maNhaCungCap} value={s.maNhaCungCap}>{s.tenNhaCungCap}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Số lượng nhập *</Label>
              <Input type="number" min={1} value={form.soLuongNhap} onChange={e => {
                const val = parseInt(e.target.value) || 0;
                setForm(f => ({ ...f, soLuongNhap: val < 0 ? 0 : val }));
              }} />
            </div>
            <div><Label>Ghi chú</Label><Textarea value={form.ghiChu} onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">Gửi yêu cầu nhập</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog từ chối */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Từ chối phiếu nhập kho {rejectingId}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Lý do từ chối *</Label>
              <Textarea placeholder="Nhập lý do từ chối..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleRejectConfirm} variant="destructive">Xác nhận từ chối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
