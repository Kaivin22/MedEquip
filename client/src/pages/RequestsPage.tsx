import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateRequest, apiApproveRequest, apiCreateAllocation, apiDeleteRequest } from '@/lib/apiSync';
import { PhieuYeuCauCapPhat } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Check, X, Eye, CheckCheck, Trash2, ChevronsUpDown } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

const STATUS_MAP = { 
  CHO_DUYET: 'Chờ duyệt', 
  DA_DUYET: 'Đã duyệt', 
  TU_CHOI: 'Từ chối',
  DA_CAP_PHAT: 'Đã cấp phát'
} as const;

const STATUS_COLORS = { 
  CHO_DUYET: 'bg-warning/10 text-warning', 
  DA_DUYET: 'bg-success/10 text-success', 
  TU_CHOI: 'bg-destructive/10 text-destructive',
  DA_CAP_PHAT: 'bg-indigo-100 text-indigo-700'
};

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(store.getRequests());
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterEquip, setFilterEquip] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
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

  const canCreate = user?.vaiTro === 'NV_BV' || user?.vaiTro === 'ADMIN';
  const canApprove = user?.vaiTro === 'TRUONG_KHOA' || user?.vaiTro === 'ADMIN';
  const canAllocate = user?.vaiTro === 'ADMIN' || user?.vaiTro === 'NV_KHO';

  const [form, setForm] = useState({ maThietBi: '', maKhoa: '', soLuongYeuCau: 1, lyDo: '' });

  const filtered = useMemo(() => {
    let list = requests;
    if (user?.vaiTro === 'NV_BV') list = list.filter(r => r.maNguoiYeuCau === user.maNguoiDung);
    
    return list.filter(r => {
      const matchSearch = r.maPhieu.toLowerCase().includes(search.toLowerCase());
      const matchDate = !filterDate || r.ngayTao.startsWith(filterDate);
      const matchUser = filterUser === 'all' || r.maNguoiYeuCau === filterUser;
      const matchEquip = filterEquip === 'all' || r.maThietBi === filterEquip;
      const matchDept = filterDept === 'all' || r.maKhoa === filterDept;
      
      return matchSearch && matchDate && matchUser && matchEquip && matchDept;
    });
  }, [requests, search, user, filterDate, filterUser, filterEquip, filterDept]);

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

  const handleAllocate = async (r: PhieuYeuCauCapPhat) => {
    if (!window.confirm('Bạn có muốn in phiếu hay không?')) return;
    
    try {
      const result = await apiCreateAllocation({
        maPhieuYeuCau: r.maPhieu,
        maNhanVienKho: user!.maNguoiDung,
        maThietBi: r.maThietBi,
        maNguoiMuon: r.maNguoiYeuCau,
        maKhoa: r.maKhoa,
        soLuongCapPhat: r.soLuongYeuCau,
        ghiChu: 'Cấp phát trực tiếp từ yêu cầu'
      });

      if (result.success) {
        setRequests(store.getRequests());
        toast({ title: 'Thành công', description: 'Đã cấp phát thiết bị và cập nhật tồn kho' });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Cấp phát thất bại', variant: 'destructive' });
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

  const handleDelete = async (maPhieu: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phiếu yêu cầu ${maPhieu}?`)) return;
    try {
      const result = await apiDeleteRequest(maPhieu);
      if (result.success) {
        setRequests(store.getRequests());
        toast({ title: 'Đã xóa', description: `Đã xóa phiếu yêu cầu ${maPhieu}` });
        if (viewing?.maPhieu === maPhieu) setViewOpen(false);
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Xóa thất bại', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 bg-card rounded-xl border border-border/50 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Mã phiếu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            
            <SearchableSelect 
              options={[{ value: 'all', label: 'Tất cả người yêu cầu' }, ...users.map(u => ({ value: u.maNguoiDung, label: u.hoTen }))]} 
              value={filterUser} 
              onValueChange={setFilterUser} 
              placeholder="Người yêu cầu"
            />
            
            <SearchableSelect 
              options={[{ value: 'all', label: 'Tất cả thiết bị' }, ...equipment.map(e => ({ value: e.maThietBi, label: e.tenThietBi }))]} 
              value={filterEquip} 
              onValueChange={setFilterEquip} 
              placeholder="Thiết bị"
            />
            
            <SearchableSelect 
              options={[{ value: 'all', label: 'Tất cả khoa' }, ...departments.map(k => ({ value: k.maKhoa, label: k.tenKhoa }))]} 
              value={filterDept} 
              onValueChange={setFilterDept} 
              placeholder="Khoa"
            />
          </div>
          
          <div className="flex gap-2 w-full lg:w-auto">
            {(search || filterDate || filterUser !== 'all' || filterEquip !== 'all' || filterDept !== 'all') && (
              <Button variant="outline" onClick={() => { setSearch(''); setFilterDate(''); setFilterUser('all'); setFilterEquip('all'); setFilterDept('all'); }}>
                Xóa lọc
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => { setForm({ maThietBi: '', maKhoa: '', soLuongYeuCau: 1, lyDo: '' }); setDialogOpen(true); }} className="gradient-primary text-primary-foreground whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" /> Tạo phiếu
              </Button>
            )}
          </div>
        </div>
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
            {canApprove && <th className="text-center p-3 font-medium text-muted-foreground">Duyệt YC</th>}
            <th className="text-center p-3 font-medium text-muted-foreground">Cấp phát</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Ngày tạo</th>
            {user?.vaiTro === 'ADMIN' && <th className="text-center p-3 font-medium text-muted-foreground">Xóa</th>}
          </tr></thead>
          <tbody>
            {filtered.map(r => {
              const tb = equipment.find(e => e.maThietBi === r.maThietBi);
              const khoa = departments.find(k => k.maKhoa === r.maKhoa);
              const nguoi = users.find(u => u.maNguoiDung === r.maNguoiYeuCau);
              return (
                <tr key={r.maPhieu} className="border-b hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => { setViewing(r); setViewOpen(true); }}>
                  <td className="p-3 font-mono text-xs">
                    <span className="text-primary font-medium group-hover:underline">
                      {r.maPhieu}
                    </span>
                  </td>
                  <td className="p-3">{nguoi?.hoTen || '-'}</td>
                  <td className="p-3">{tb?.tenThietBi || '-'}</td>
                  <td className="p-3">{khoa?.tenKhoa || '-'}</td>
                  <td className="p-3 text-center font-medium">{r.soLuongYeuCau}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.trangThai]}`}>
                      {STATUS_MAP[r.trangThai]}
                    </span>
                  </td>
                  {canApprove && (
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      {r.trangThai === 'CHO_DUYET' ? (
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:bg-success/20" onClick={() => handleApprove(r.maPhieu)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/20" onClick={() => { setRejectingId(r.maPhieu); setRejectReason(''); setRejectOpen(true); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  )}
                  <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                    {r.trangThai === 'DA_CAP_PHAT' ? (
                      <div className="flex justify-center"><div className="bg-emerald-100 text-emerald-700 p-1 rounded-full border border-emerald-200"><CheckCheck className="w-4 h-4" /></div></div>
                    ) : r.trangThai === 'DA_DUYET' && canAllocate ? (
                      <div className="flex justify-center"><Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/20" onClick={() => handleAllocate(r)}><Check className="w-4 h-4" /></Button></div>
                    ) : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{r.ngayTao.slice(0, 10)}</td>
                  {user?.vaiTro === 'ADMIN' && (
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(r.maPhieu)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
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
              <SearchableSelect 
                options={equipment.filter(e => e.trangThai).map(e => ({ value: e.maThietBi, label: e.tenThietBi }))} 
                value={form.maThietBi} 
                onValueChange={v => setForm(f => ({ ...f, maThietBi: v }))} 
                placeholder="Chọn thiết bị..."
              />
            </div>
            <div>
              <Label>Khoa *</Label>
              <SearchableSelect 
                options={departments.filter(k => k.trangThai).map(k => ({ value: k.maKhoa, label: k.tenKhoa }))} 
                value={form.maKhoa} 
                onValueChange={v => setForm(f => ({ ...f, maKhoa: v }))} 
                placeholder="Chọn khoa..."
              />
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
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Mã phiếu:</span> <strong>{viewing.maPhieu}</strong></p>
                <p><span className="text-muted-foreground">Người yêu cầu:</span> {users.find(u => u.maNguoiDung === viewing.maNguoiYeuCau)?.hoTen}</p>
                <p><span className="text-muted-foreground">Thiết bị:</span> {equipment.find(e => e.maThietBi === viewing.maThietBi)?.tenThietBi}</p>
                <p><span className="text-muted-foreground">Khoa:</span> {departments.find(k => k.maKhoa === viewing.maKhoa)?.tenKhoa}</p>
                <p><span className="text-muted-foreground">Số lượng:</span> {viewing.soLuongYeuCau}</p>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Lý do cấp phát:</p>
                  <div className="bg-muted p-3 rounded-md text-foreground italic border-l-4 border-primary">
                    {viewing.lyDo || 'Không có lý do chi tiết'}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t space-y-1">
                  <p><span className="text-muted-foreground">Trạng thái:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[viewing.trangThai]}`}>{STATUS_MAP[viewing.trangThai]}</span></p>
                  {viewing.ngayDuyet && <p><span className="text-muted-foreground">Ngày duyệt:</span> {viewing.ngayDuyet.slice(0, 10)}</p>}
                  {viewing.nguoiDuyet && <p><span className="text-muted-foreground">Người duyệt:</span> {users.find(u => u.maNguoiDung === viewing.nguoiDuyet)?.hoTen || viewing.nguoiDuyet}</p>}
                  {viewing.lyDoTuChoi && <p><span className="text-muted-foreground">Lý do từ chối:</span> <span className="text-destructive">{viewing.lyDoTuChoi}</span></p>}
                </div>
              </div>
              
              {canApprove && viewing.trangThai === 'CHO_DUYET' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => { handleApprove(viewing.maPhieu); setViewOpen(false); }}>
                    <Check className="w-4 h-4 mr-2" /> Phê duyệt
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => { setRejectingId(viewing.maPhieu); setRejectReason(''); setRejectOpen(true); setViewOpen(false); }}>
                    <X className="w-4 h-4 mr-2" /> Từ chối
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
