import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateImportRequest, apiApproveImportRequest, apiDeleteImportRequest } from '@/lib/apiSync';
import { PhieuYeuCauNhap } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Plus, Search, CheckCircle, XCircle, Trash2, Image as ImageIcon } from 'lucide-react';

export default function ImportRequestsPage({ onRefresh }: { onRefresh: () => void }) {
  const { user } = useAuth();
  const [data, setData] = useState(store.getImportRequests());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const suppliers = store.getSuppliers();
  const users = store.getUsers();

  const canCreate = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';
  const canApprove = user?.vaiTro === 'TRUONG_KHOA' || user?.vaiTro === 'ADMIN';
  const canDelete = user?.vaiTro === 'ADMIN';

  const [form, setForm] = useState({ 
    tenThietBi: '', 
    loaiThietBi: 'Máy móc', 
    donViTinh: 'Cái', 
    soLuong: 1, 
    mucDichSuDung: '',
    maNhaCungCap: '',
    moTa: '',
    hinhAnh: ''
  });

  const filtered = useMemo(() => {
    return data.filter(r => r.maPhieu.toLowerCase().includes(search.toLowerCase()) || r.tenThietBi.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, hinhAnh: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!form.tenThietBi || !form.maNhaCungCap) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tên thiết bị và nhà cung cấp', variant: 'destructive' }); return;
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
        onRefresh();
        toast({ 
          title: 'Thành công', 
          description: approved ? 'Đã duyệt phiếu và tự động tạo thiết bị/tồn kho' : 'Đã từ chối phiếu' 
        });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi xảy ra', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const handleDelete = async (maPhieu: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch sử này không?')) return;
    try {
      const result = await apiDeleteImportRequest(maPhieu);
      if (result.success) {
        setData(store.getImportRequests());
        onRefresh();
        toast({ title: 'Đã xóa', description: `Đã xóa phiếu ${maPhieu}` });
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
          <Input placeholder="Tìm mã phiếu, tên thiết bị..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canCreate && (
          <Button onClick={() => { 
            setForm({ tenThietBi: '', loaiThietBi: 'Máy móc', donViTinh: 'Cái', soLuong: 1, mucDichSuDung: '', maNhaCungCap: '', moTa: '', hinhAnh: '' }); 
            setDialogOpen(true); 
          }} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Tạo YC Nhập
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-medium text-muted-foreground">Mã phiếu</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Thiết bị</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Nhà cung cấp</th>
              <th className="text-center p-4 font-medium text-muted-foreground">SL</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Trạng thái</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Ngày tạo</th>
              <th className="text-right p-4 font-medium text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map(r => (
              <tr key={r.maPhieu} className="hover:bg-muted/30 transition-colors">
                <td className="p-4 font-mono text-xs">{r.maPhieu}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border bg-muted flex-shrink-0 overflow-hidden">
                      {r.hinhAnh ? <img src={r.hinhAnh} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 m-2.5 text-muted-foreground/30" />}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{r.tenThietBi}</div>
                      <div className="text-xs text-muted-foreground">{r.loaiThietBi} ({r.donViTinh})</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">
                  {suppliers.find(s => s.maNhaCungCap === r.maNhaCungCap)?.tenNhaCungCap || '—'}
                </td>
                <td className="p-4 text-center">
                  <span className="font-bold bg-muted px-2 py-1 rounded">{r.soLuong}</span>
                </td>
                <td className="p-4">
                  {r.trangThai === 'CHO_DUYET' ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1">
                      Chờ duyệt
                    </Badge>
                  ) : r.trangThai === 'DA_DUYET' || r.trangThai === 'DA_NHAP' ? (
                    <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1">
                      {r.trangThai === 'DA_NHAP' ? 'Đã nhập kho' : 'Đã duyệt'}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-3 py-1">
                      Từ chối
                    </Badge>
                  )}
                </td>
                <td className="p-4 text-muted-foreground">
                  {format(new Date(r.ngayTao), 'yyyy-MM-dd', { locale: vi })}
                  <div className="text-xs">{users.find(u => u.maNguoiDung === r.maNguoiYeuCau)?.hoTen || '—'}</div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2 items-center">
                    {canApprove && r.trangThai === 'CHO_DUYET' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 h-8" onClick={() => handleApprove(r.maPhieu, true)}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Duyệt
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 h-8" onClick={() => handleApprove(r.maPhieu, false)}>
                          <XCircle className="w-4 h-4 mr-1" /> Từ chối
                        </Button>
                      </>
                    )}
                    {r.trangThai === 'TU_CHOI' && r.lyDoTuChoi && (
                      <div className="text-xs text-red-500 italic max-w-[150px] ml-auto truncate" title={r.lyDoTuChoi}>Lý do: {r.lyDoTuChoi}</div>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8 ml-2" onClick={() => handleDelete(r.maPhieu)}>
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
      {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Không có yêu cầu nhập thiết bị nào</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md lg:max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>Tạo Yêu cầu Nhập Thiết bị mới</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Tên thiết bị (Mới) *</Label><Input value={form.tenThietBi} onChange={e => setForm(f => ({ ...f, tenThietBi: e.target.value }))} placeholder="Ví dụ: Máy MRI 3 Tesla" /></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Loại thiết bị</Label>
                <Select value={form.loaiThietBi} onValueChange={v => setForm(f => ({ ...f, loaiThietBi: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Máy móc">Máy móc</SelectItem>
                    <SelectItem value="Dụng cụ">Dụng cụ y tế</SelectItem>
                    <SelectItem value="Vật tư">Vật tư tiêu hao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Đơn vị tính</Label><Input value={form.donViTinh} onChange={e => setForm(f => ({ ...f, donViTinh: e.target.value }))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Số lượng *</Label>
                <Input type="number" min={1} value={form.soLuong} onChange={e => setForm(f => ({ ...f, soLuong: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Nhà cung cấp *</Label>
                <Select value={form.maNhaCungCap} onValueChange={v => setForm(f => ({ ...f, maNhaCungCap: v }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.maNhaCungCap} value={s.maNhaCungCap}>{s.tenNhaCungCap}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div><Label>Hình ảnh sản phẩm</Label>
              <div className="flex items-center gap-4 mt-1">
                {form.hinhAnh && <div className="w-16 h-16 rounded border overflow-hidden shrink-0"><img src={form.hinhAnh} className="w-full h-full object-cover" /></div>}
                <Input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
              </div>
            </div>

            <div><Label>Mô tả chi tiết / Chức năng</Label><Textarea value={form.moTa} onChange={e => setForm(f => ({ ...f, moTa: e.target.value }))} placeholder="Chi tiết kỹ thuật, chức năng chính..." /></div>
            <div><Label>Mục đích sử dụng</Label><Textarea value={form.mucDichSuDung} onChange={e => setForm(f => ({ ...f, mucDichSuDung: e.target.value }))} placeholder="Lý do khoa cần thiết bị này..." /></div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} className="gradient-primary text-white">Tạo Yêu Cầu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
