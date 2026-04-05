//update
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateImportRequest, apiApproveImportRequest } from '@/lib/apiSync';
import { PhieuYeuCauNhap } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, CheckCircle, XCircle } from 'lucide-react';

export default function ImportRequestsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getImportRequests());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const canCreate = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';
  const canApprove = user?.vaiTro === 'TRUONG_KHOA' || user?.vaiTro === 'ADMIN';

  const [form, setForm] = useState({ tenThietBi: '', loaiThietBi: '', donViTinh: 'Cái', soLuong: 1, mucDichSuDung: '' });

  const filtered = useMemo(() => {
    return data.filter(r => r.maPhieu.toLowerCase().includes(search.toLowerCase()) || r.tenThietBi.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const handleCreate = async () => {
    if (!form.tenThietBi) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tên thiết bị', variant: 'destructive' }); return;
    }
    if (form.soLuong < 1) {
      toast({ title: 'Lỗi', description: 'Số lượng phải lớn hơn 0', variant: 'destructive' }); return;
    }
    try {
      const result = await apiCreateImportRequest({ ...form, maNguoiYeuCau: user!.maNguoiDung });
      if (result.success) {
        setData(store.getImportRequests());
        setDialogOpen(false);
        toast({ title: 'Thành công', description: 'Đã tạo phiếu yêu cầu nhập thiết bị mới' });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi xảy ra', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const handleApprove = async (maPhieu: string, approved: boolean) => {
    const lyDo = approved ? '' : prompt('Nhập lý do từ chối:');
    if (!approved && lyDo === null) return;
    
    try {
      const result = await apiApproveImportRequest(maPhieu, approved, lyDo || undefined);
      if (result.success) {
        setData(store.getImportRequests());
        toast({ title: 'Thành công', description: approved ? 'Đã duyệt phiếu' : 'Đã từ chối phiếu' });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi xảy ra', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const users = store.getUsers();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm mã phiếu, tên thiết bị..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canCreate && (
          <Button onClick={() => { setForm({ tenThietBi: '', loaiThietBi: '', donViTinh: 'Cái', soLuong: 1, mucDichSuDung: '' }); setDialogOpen(true); }} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Tạo YC Nhập
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Mã phiếu</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Tên thiết bị</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Loại</th>
              <th className="text-center p-3 font-medium text-muted-foreground">SL</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Trạng thái</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Ngày tạo</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.maPhieu} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{r.maPhieu}</td>
                <td className="p-3 font-medium">
                  <div>{r.tenThietBi}</div>
                  {r.mucDichSuDung && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{r.mucDichSuDung}</div>}
                </td>
                <td className="p-3 text-muted-foreground">{r.loaiThietBi} ({r.donViTinh})</td>
                <td className="p-3 text-center font-bold px-2 py-1 bg-muted rounded my-2 inline-block ml-3">{r.soLuong}</td>
                <td className="p-3">
                  <Badge variant={r.trangThai === 'DA_DUYET' ? 'default' : r.trangThai === 'TU_CHOI' ? 'destructive' : r.trangThai === 'DA_NHAP' ? 'secondary' : 'outline'} className={r.trangThai === 'DA_DUYET' ? 'bg-green-500 hover:bg-green-600' : ''}>
                    {r.trangThai === 'CHO_DUYET' ? 'Chờ duyệt' : r.trangThai === 'DA_DUYET' ? 'Đã duyệt' : r.trangThai === 'DA_NHAP' ? 'Đã nhập kho' : 'Từ chối'}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  <div>{r.ngayTao.slice(0, 10)}</div>
                  <div className="text-muted-foreground">{users.find(u => u.maNguoiDung === r.maNguoiYeuCau)?.hoTen || 'Người dùng (đã xóa)'}</div>
                </td>
                <td className="p-3 text-right">
                  {canApprove && r.trangThai === 'CHO_DUYET' && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleApprove(r.maPhieu, true)}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Duyệt
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleApprove(r.maPhieu, false)}>
                        <XCircle className="w-4 h-4 mr-1" /> Từ chối
                      </Button>
                    </div>
                  )}
                  {r.trangThai === 'TU_CHOI' && r.lyDoTuChoi && (
                    <div className="text-xs text-red-500 italic max-w-[150px] ml-auto truncate" title={r.lyDoTuChoi}>Lý do: {r.lyDoTuChoi}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Không có yêu cầu nhập thiết bị nào</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo Yêu cầu Nhập Thiết bị mới</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên thiết bị (Mới) *</Label><Input value={form.tenThietBi} onChange={e => setForm(f => ({ ...f, tenThietBi: e.target.value }))} placeholder="Ví dụ: Máy MRI 3 Tesla" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Loại thiết bị</Label>
                <Select value={form.loaiThietBi} onValueChange={v => setForm(f => ({ ...f, loaiThietBi: v }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Máy móc">Máy móc</SelectItem>
                    <SelectItem value="Vật tư">Vật tư tiêu hao</SelectItem>
                    <SelectItem value="Dụng cụ">Dụng cụ y tế</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Đơn vị tính</Label><Input value={form.donViTinh} onChange={e => setForm(f => ({ ...f, donViTinh: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Số lượng *</Label>
              <Input type="number" min={1} value={form.soLuong} onChange={e => setForm(f => ({ ...f, soLuong: parseInt(e.target.value) || 0 }))} />
            </div>
            <div><Label>Mục đích sử dụng</Label><Textarea value={form.mucDichSuDung} onChange={e => setForm(f => ({ ...f, mucDichSuDung: e.target.value }))} placeholder="Lý do cần nhập thiết bị này..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">Tạo Yêu Cầu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
