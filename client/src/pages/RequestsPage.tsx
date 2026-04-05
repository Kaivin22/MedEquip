//update

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateRequest, apiApproveRequest } from '@/lib/apiSync';
import { PhieuYeuCauCapPhat } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Check, X, Eye } from 'lucide-react';

const STATUS_MAP = { CHO_DUYET: 'Chờ duyệt', DA_DUYET: 'Đã duyệt', TU_CHOI: 'Từ chối' } as const;
const STATUS_COLORS = { CHO_DUYET: 'bg-warning/10 text-warning', DA_DUYET: 'bg-success/10 text-success', TU_CHOI: 'bg-destructive/10 text-destructive' };

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(store.getRequests());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<PhieuYeuCauCapPhat | null>(null);
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const equipment = store.getEquipment();
  const departments = store.getDepartments();
  const users = store.getUsers();
  const inventory = store.getInventory();

  const canCreate = user?.vaiTro === 'NV_BV';
  const canApprove = user?.vaiTro === 'TRUONG_KHOA' || user?.vaiTro === 'ADMIN';

  const [form, setForm] = useState({ maThietBi: '', maKhoa: '', soLuongYeuCau: 1, lyDo: '' });

  const filtered = useMemo(() => {
    let list = requests;
    if (user?.vaiTro === 'NV_BV') list = list.filter(r => r.maNguoiYeuCau === user.maNguoiDung);
    return list.filter(r => r.maPhieu.toLowerCase().includes(search.toLowerCase()));
  }, [requests, search, user]);

  const addNotification = (tieuDe: string, noiDung: string, loai: 'info' | 'success' | 'warning' | 'error', nguoiNhan: string) => {
    const notifs = store.getNotifications();
    const localId = 'TB-N-' + Date.now().toString(36);
    notifs.push({ id: localId, tieuDe, noiDung, loai, nguoiNhan, daDoc: false, ngayTao: new Date().toISOString() });
    store.setNotifications(notifs);
  };

  const handleCreate = async () => {
    if (!form.maThietBi || !form.maKhoa || !form.lyDo) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập đầy đủ thông tin', variant: 'destructive' }); return;
    }
    if (form.soLuongYeuCau < 1) {
      toast({ title: 'Lỗi', description: 'Số lượng phải lớn hơn 0', variant: 'destructive' }); return;
    }
    // Kiểm tra số lượng yêu cầu không vượt quá kho hiện có
    const invItem = inventory.find(i => i.maThietBi === form.maThietBi);
    if (invItem && form.soLuongYeuCau > invItem.soLuongKho) {
      toast({ title: 'Quá số lượng kho hiện có', description: `Số lượng yêu cầu (${form.soLuongYeuCau}) vượt quá số lượng trong kho (${invItem.soLuongKho}).`, variant: 'destructive' }); return;
    }
    if (!invItem) {
      toast({ title: 'Lỗi', description: 'Thiết bị chưa có trong kho', variant: 'destructive' }); return;
    }
    try {
      const result = await apiCreateRequest({ maNguoiYeuCau: user!.maNguoiDung, ...form });
      if (result.success) {
        setRequests(store.getRequests());
        setDialogOpen(false);
        toast({ title: 'Thành công', description: `Đã tạo phiếu yêu cầu` });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi xảy ra', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const handleApprove = async (maPhieu: string) => {
    try {
      const result = await apiApproveRequest(maPhieu, true);
      if (result.success) {
        setRequests(store.getRequests());
        toast({ title: 'Đã phê duyệt' });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Duyệt thất bại', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập lý do từ chối', variant: 'destructive' }); return;
    }
    try {
      const result = await apiApproveRequest(rejectingId, false, rejectReason);
      if (result.success) {
        setRequests(store.getRequests());
        setRejectOpen(false);
        toast({ title: 'Đã từ chối' });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Thao tác thất bại', variant: 'destructive' });
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
          <Input placeholder="Tìm phiếu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canCreate && (
          <Button onClick={() => { setForm({ maThietBi: '', maKhoa: '', soLuongYeuCau: 1, lyDo: '' }); setDialogOpen(true); }} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Tạo phiếu yêu cầu
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã phiếu</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Người yêu cầu</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Thiết bị</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Khoa</th>
            <th className="text-center p-3 font-medium text-muted-foreground">SL</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Ngày tạo</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
          </tr></thead>
          <tbody>
            {filtered.map(r => {
              const tb = equipment.find(e => e.maThietBi === r.maThietBi);
              const khoa = departments.find(k => k.maKhoa === r.maKhoa);
              const nguoi = users.find(u => u.maNguoiDung === r.maNguoiYeuCau);
              return (
                <tr key={r.maPhieu} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.maPhieu}</td>
                  <td className="p-3">{nguoi?.hoTen ? nguoi.hoTen : 'Người dùng (đã xóa)'}</td>
                  <td className="p-3">{tb?.tenThietBi || '-'}</td>
                  <td className="p-3">{khoa?.tenKhoa || '-'}</td>
                  <td className="p-3 text-center font-medium">{r.soLuongYeuCau}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.trangThai]}`}>
                      {STATUS_MAP[r.trangThai]}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{r.ngayTao.slice(0, 10)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="w-3.5 h-3.5" /></Button>
                      {canApprove && r.trangThai === 'CHO_DUYET' && (
                        <>
                          <Button variant="ghost" size="sm" className="text-success" onClick={() => handleApprove(r.maPhieu)}><Check className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setRejectingId(r.maPhieu); setRejectReason(''); setRejectOpen(true); }}><X className="w-3.5 h-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Không có phiếu yêu cầu</div>}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo phiếu yêu cầu cấp phát</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Thiết bị *</Label>
              <Select value={form.maThietBi} onValueChange={v => setForm(f => ({ ...f, maThietBi: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn thiết bị" /></SelectTrigger>
                <SelectContent>{equipment.filter(e => e.trangThai).map(e => <SelectItem key={e.maThietBi} value={e.maThietBi}>{e.tenThietBi}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Khoa *</Label>
              <Select value={form.maKhoa} onValueChange={v => setForm(f => ({ ...f, maKhoa: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn khoa" /></SelectTrigger>
                <SelectContent>{departments.filter(k => k.trangThai).map(k => <SelectItem key={k.maKhoa} value={k.maKhoa}>{k.tenKhoa}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Số lượng * {form.maThietBi && (() => {
                const inv = inventory.find(i => i.maThietBi === form.maThietBi);
                return inv ? <span className="text-xs text-muted-foreground">(Trong kho: {inv.soLuongKho})</span> : null;
              })()}</Label>
              <Input type="number" min={1} value={form.soLuongYeuCau} onChange={e => {
                const val = parseInt(e.target.value) || 0;
                setForm(f => ({ ...f, soLuongYeuCau: val < 0 ? 0 : val }));
              }} />
            </div>
            <div><Label>Lý do *</Label><Textarea value={form.lyDo} onChange={e => setForm(f => ({ ...f, lyDo: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">Tạo phiếu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Từ chối phiếu</DialogTitle></DialogHeader>
          <div><Label>Lý do từ chối *</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleReject}>Từ chối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chi tiết phiếu yêu cầu</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Mã phiếu:</span> <strong>{viewing.maPhieu}</strong></p>
              <p><span className="text-muted-foreground">Người yêu cầu:</span> {users.find(u => u.maNguoiDung === viewing.maNguoiYeuCau)?.hoTen || 'Người dùng (đã xóa)'}</p>
              <p><span className="text-muted-foreground">Thiết bị:</span> {equipment.find(e => e.maThietBi === viewing.maThietBi)?.tenThietBi}</p>
              <p><span className="text-muted-foreground">Khoa:</span> {departments.find(k => k.maKhoa === viewing.maKhoa)?.tenKhoa}</p>
              <p><span className="text-muted-foreground">Số lượng:</span> {viewing.soLuongYeuCau}</p>
              <p><span className="text-muted-foreground">Lý do:</span> {viewing.lyDo}</p>
              <p><span className="text-muted-foreground">Trạng thái:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[viewing.trangThai]}`}>{STATUS_MAP[viewing.trangThai]}</span></p>
              {viewing.ngayDuyet && <p><span className="text-muted-foreground">Ngày duyệt:</span> {viewing.ngayDuyet.slice(0, 10)}</p>}
              {viewing.lyDoTuChoi && <p><span className="text-muted-foreground">Lý do từ chối:</span> <span className="text-destructive">{viewing.lyDoTuChoi}</span></p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
