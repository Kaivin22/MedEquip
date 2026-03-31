import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store, generateId } from '@/lib/store';
import { apiCreateAllocation } from '@/lib/apiSync';
import { PhieuCapPhat } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Search } from 'lucide-react';

export default function AllocationsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getAllocations());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const equipment = store.getEquipment();
  const allRequests = store.getRequests();
  const departments = store.getDepartments();
  const users = store.getUsers();
  const canCreate = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';

  // Only show approved requests that haven't been allocated yet
  const allocatedRequestIds = new Set(data.map(d => d.maPhieuYeuCau));
  const availableRequests = allRequests.filter(r => r.trangThai === 'DA_DUYET' && !allocatedRequestIds.has(r.maPhieu));

  const [form, setForm] = useState({ maPhieuYeuCau: '', soLuongCapPhat: 1, ghiChu: '' });

  const selectedRequest = allRequests.find(r => r.maPhieu === form.maPhieuYeuCau);

  const handleCreate = async () => {
    if (!form.maPhieuYeuCau) { toast({ title: 'Lỗi', description: 'Chọn phiếu yêu cầu', variant: 'destructive' }); return; }
    const req = allRequests.find(r => r.maPhieu === form.maPhieuYeuCau);
    if (!req) return;

    if (form.soLuongCapPhat < 1) {
      toast({ title: 'Lỗi', description: 'Số lượng phải lớn hơn 0', variant: 'destructive' }); return;
    }

    // Checking max allocation in UI
    const invItem = store.getInventory().find(i => i.maThietBi === req.maThietBi);
    if (invItem && form.soLuongCapPhat > invItem.soLuongKho) {
       toast({ title: 'Lỗi', description: `Số lượng mượn vượt quá kho hiện tại (${invItem.soLuongKho})`, variant: 'destructive' });
       return;
    }

    try {
      const result = await apiCreateAllocation({
        maPhieuYeuCau: form.maPhieuYeuCau,
        maNhanVienKho: user!.maNguoiDung,
        maThietBi: req.maThietBi,
        maNguoiMuon: req.maNguoiYeuCau,
        maKhoa: req.maKhoa,
        soLuongCapPhat: form.soLuongCapPhat,
        ghiChu: form.ghiChu
      });
      if (result.success) {
        setData(store.getAllocations());
        setDialogOpen(false);
        toast({ title: 'Thành công', description: `Đã lập phiếu cấp phát thành công.` });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi xảy ra', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm phiếu cấp phát..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canCreate && <Button onClick={() => { setForm({ maPhieuYeuCau: '', soLuongCapPhat: 1, ghiChu: '' }); setDialogOpen(true); }} className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Lập phiếu</Button>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã phiếu</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Phiếu YC</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Thiết bị</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Người mượn</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Khoa</th>
            <th className="text-left p-3 font-medium text-muted-foreground">NV Kho</th>
            <th className="text-center p-3 font-medium text-muted-foreground">SL</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Ngày</th>
          </tr></thead>
          <tbody>
            {data.filter(d => d.maPhieu.toLowerCase().includes(search.toLowerCase())).map(d => {
              const nguoiMuon = users.find(u => u.maNguoiDung === d.maNguoiMuon);
              const khoa = departments.find(k => k.maKhoa === d.maKhoa);
              return (
                <tr key={d.maPhieu} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{d.maPhieu}</td>
                  <td className="p-3 text-xs">{d.maPhieuYeuCau}</td>
                  <td className="p-3">{equipment.find(e => e.maThietBi === d.maThietBi)?.tenThietBi}</td>
                  <td className="p-3">{nguoiMuon?.hoTen || '-'}</td>
                  <td className="p-3">{khoa?.tenKhoa || '-'}</td>
                  <td className="p-3">{users.find(u => u.maNguoiDung === d.maNhanVienKho)?.hoTen}</td>
                  <td className="p-3 text-center font-medium">{d.soLuongCapPhat}</td>
                  <td className="p-3 text-xs text-muted-foreground">{d.ngayCapPhat.slice(0, 10)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <div className="text-center py-12 text-muted-foreground">Chưa có phiếu cấp phát</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lập phiếu cấp phát (cho khoa mượn)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Phiếu yêu cầu đã duyệt *</Label>
              <Select value={form.maPhieuYeuCau} onValueChange={v => setForm(f => ({ ...f, maPhieuYeuCau: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn phiếu" /></SelectTrigger>
                <SelectContent>
                  {availableRequests.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">Không có phiếu chờ cấp phát</div>}
                  {availableRequests.map(r => {
                    const nguoi = users.find(u => u.maNguoiDung === r.maNguoiYeuCau);
                    const khoa = departments.find(k => k.maKhoa === r.maKhoa);
                    return <SelectItem key={r.maPhieu} value={r.maPhieu}>{r.maPhieu} - {equipment.find(e => e.maThietBi === r.maThietBi)?.tenThietBi} ({nguoi?.hoTen} - {khoa?.tenKhoa})</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            {selectedRequest && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><span className="text-muted-foreground">Người mượn:</span> <strong>{users.find(u => u.maNguoiDung === selectedRequest.maNguoiYeuCau)?.hoTen}</strong></p>
                <p><span className="text-muted-foreground">Khoa:</span> <strong>{departments.find(k => k.maKhoa === selectedRequest.maKhoa)?.tenKhoa}</strong></p>
                <p><span className="text-muted-foreground">Thiết bị:</span> {equipment.find(e => e.maThietBi === selectedRequest.maThietBi)?.tenThietBi}</p>
                <p><span className="text-muted-foreground">SL yêu cầu:</span> {selectedRequest.soLuongYeuCau}</p>
                {(() => { const inv = store.getInventory().find(i => i.maThietBi === selectedRequest.maThietBi); return inv ? <p><span className="text-muted-foreground">Còn trong kho:</span> <strong className="text-primary">{inv.soLuongKho}</strong></p> : null; })()}
              </div>
            )}
            <div>
              <Label>Số lượng cấp phát</Label>
              <Input type="number" min={1} value={form.soLuongCapPhat} onChange={e => {
                const val = parseInt(e.target.value) || 0;
                setForm(f => ({ ...f, soLuongCapPhat: val < 0 ? 0 : val }));
              }} />
            </div>
            <div><Label>Ghi chú</Label><Textarea value={form.ghiChu} onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">Lập phiếu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
