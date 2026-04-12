import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateRequest, apiApproveRequest, apiCreateAllocation, apiDeleteRequest } from '@/lib/apiSync';
import { PhieuYeuCauCapPhat, ChiTietYeuCau } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Search, Check, X, CheckCheck, Trash2, ShoppingCart, Plus, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const STATUS_MAP = { 
  CHO_DUYET: 'Chờ duyệt', 
  DA_DUYET: 'Đã duyệt', 
  TU_CHOI: 'Từ chối',
  DA_CAP_PHAT: 'Đã cấp phát',
  DA_TRA_DU: 'Đã trả đủ'
} as const;

const STATUS_COLORS = { 
  CHO_DUYET: 'bg-warning/10 text-warning', 
  DA_DUYET: 'bg-success/10 text-success', 
  TU_CHOI: 'bg-destructive/10 text-destructive',
  DA_CAP_PHAT: 'bg-indigo-100 text-indigo-700',
  DA_TRA_DU: 'bg-muted text-muted-foreground'
};

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(store.getRequests());
  const [search, setSearch] = useState('');
  
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<PhieuYeuCauCapPhat | null>(null);
  
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<ChiTietYeuCau[]>([]);
  const [reqReason, setReqReason] = useState('');

  const equipment = store.getEquipment();
  const departments = store.getDepartments();
  const users = store.getUsers();
  const inventory = store.getInventory();

  const canApprove = user?.vaiTro === 'TRUONG_KHOA' || user?.vaiTro === 'ADMIN';
  const canAllocate = user?.vaiTro === 'ADMIN' || user?.vaiTro === 'NV_KHO';
  const isTruongKhoa = user?.vaiTro === 'TRUONG_KHOA';

  const inventoryAvailable = useMemo(() => {
    return inventory.filter(i => i.soLuongKho > 0).map(i => {
      const tb = equipment.find(e => e.maThietBi === i.maThietBi);
      return { ...i, tenThietBi: tb?.tenThietBi || i.maThietBi, loaiThietBi: tb?.loaiThietBi };
    }).filter(i => i.tenThietBi.toLowerCase().includes(search.toLowerCase()));
  }, [inventory, equipment, search]);

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (isTruongKhoa) list = list.filter(r => r.maNguoiYeuCau === user.maNguoiDung);
    return list.filter(r => r.maPhieu.toLowerCase().includes(search.toLowerCase()));
  }, [requests, search, isTruongKhoa, user]);

  const addToCart = (maThietBi: string) => {
    setCart(prev => {
      const exists = prev.find(p => p.maThietBi === maThietBi);
      if (exists) return prev.map(p => p.maThietBi === maThietBi ? { ...p, soLuongYeuCau: p.soLuongYeuCau + 1 } : p);
      return [...prev, { maPhieuYeuCau: '', maThietBi, soLuongYeuCau: 1, hanMuon: '' }];
    });
    toast({ title: 'Đã thêm', description: 'Đã thêm thiết bị vào phiếu chờ.' });
  };

  const updateCartItem = (maThietBi: string, field: string, value: any) => {
    setCart(prev => prev.map(p => p.maThietBi === maThietBi ? { ...p, [field]: value } : p));
  };

  const removeCartItem = (maThietBi: string) => {
    setCart(prev => prev.filter(p => p.maThietBi !== maThietBi));
  };

  const submitCart = async () => {
    if (!reqReason) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập lý do cấp phát', variant: 'destructive' }); return;
    }
    if (cart.length === 0) {
      toast({ title: 'Lỗi', description: 'Giỏ hàng trống', variant: 'destructive' }); return;
    }
    // validate quantity
    for(const item of cart) {
      const inv = inventory.find(i => i.maThietBi === item.maThietBi);
      if(!inv || item.soLuongYeuCau > inv.soLuongKho || item.soLuongYeuCau < 1) {
         toast({ title: 'Lỗi số lượng', description: `Sô lượng yêu cầu không hợp lệ cho thiết bị ${item.maThietBi}`, variant: 'destructive' }); return;
      }
    }

    try {
      const maKhoa = departments.find(k => k.tenKhoa.includes(user?.vaiTro || 'Khoa Nội'))?.maKhoa || departments[0].maKhoa;
      
      const payload = {
        maNguoiYeuCau: user!.maNguoiDung,
        maKhoa,
        lyDo: reqReason,
        chiTiet: cart
      };

      const result = await apiCreateRequest(payload);
      if (result.success) {
        setRequests(store.getRequests());
        setCartOpen(false);
        setCart([]);
        setReqReason('');
        toast({ title: 'Thành công', description: 'Đã gửi yêu cầu cấp phát' });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi', variant: 'destructive' });
      }
    } catch(err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleApprove = async (maPhieu: string) => {
    try {
      const result = await apiApproveRequest(maPhieu, true);
      if (result.success) {
        setRequests(store.getRequests());
        toast({ title: 'Đã duyệt' });
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch(err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    try {
      const result = await apiApproveRequest(rejectingId, false, rejectReason);
      if (result.success) {
        setRequests(store.getRequests());
        setRejectOpen(false);
        toast({ title: 'Đã từ chối' });
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch(err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleAllocate = async (r: PhieuYeuCauCapPhat) => {
    if (!window.confirm('Xác nhận cấp phát toàn bộ thiết bị trong yêu cầu?')) return;
    try {
      const result = await apiCreateAllocation({
        maPhieuYeuCau: r.maPhieu,
        maNhanVienKho: user!.maNguoiDung,
        ghiChu: 'Cấp phát theo phiếu yêu cầu'
      });
      if (result.success) {
        setRequests(store.getRequests());
        toast({ title: 'Thành công', description: 'Đã xuất kho toàn bộ thiết bị yêu cầu.' });
        setViewOpen(false);
      } else {
         toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch(err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (maPhieu: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa yêu cầu này?')) return;
    try {
      const res = await apiDeleteRequest(maPhieu);
      if (res.success) {
        setRequests(store.getRequests());
        toast({ title: 'Đã xóa' });
      } else {
        toast({ title: 'Lỗi', description: res.message, variant: 'destructive' });
      }
    } catch(err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in relative pb-20">
      
      {/* TRƯỞNG KHOA VIEW - SHOPPING CART */}
      {isTruongKhoa && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Danh mục thiết bị sẵn sàng cấp phát</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Tìm thiết bị..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {inventoryAvailable.map(inv => (
              <Card key={inv.maThietBi} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-primary to-primary/50">
                      {inv.soLuongKho}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 min-h-[40px]">{inv.tenThietBi}</h3>
                  <p className="text-xs text-muted-foreground my-2">{inv.loaiThietBi || '—'}</p>
                  <Button size="sm" className="w-full mt-auto" onClick={() => addToCart(inv.maThietBi)}>
                    <Plus className="w-4 h-4 mr-1" /> Thêm vào phiếu
                  </Button>
                </CardContent>
              </Card>
            ))}
            {inventoryAvailable.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">Không có thiết bị nào trong kho</div>}
          </div>

          {/* Floating Cart Button */}
          {cart.length > 0 && (
            <button 
              onClick={() => setCartOpen(true)}
              className="fixed bottom-8 right-8 w-16 h-16 bg-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50 text-primary-foreground group"
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 border-background">
                {cart.length}
              </span>
            </button>
          )}

          <hr className="my-8" />
          <h2 className="text-xl font-bold">Lịch sử yêu cầu của Khoa</h2>
        </div>
      )}

      {/* ADMIN & NV KHO VIEW - TABULAR */}
      {!isTruongKhoa && (
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Danh sách yêu cầu cấp phát</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Tìm mã phiếu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
         </div>
      )}

      {/* COMMON TABLE VIEWER */}
      <div className="overflow-x-auto bg-card rounded-lg border shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã YC</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Người YC</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Khoa</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Số lượng TB</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Ngày tạo</th>
            {!isTruongKhoa && <th className="text-center p-3 font-medium text-muted-foreground">Thao tác</th>}
          </tr></thead>
          <tbody>
            {filteredRequests.map(r => {
              const khoa = departments.find(k => k.maKhoa === r.maKhoa);
              const nguoi = users.find(u => u.maNguoiDung === r.maNguoiYeuCau);
              return (
                <tr key={r.maPhieu} className="border-b hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { setViewing(r); setViewOpen(true); }}>
                  <td className="p-3 font-mono text-xs text-primary font-medium">{r.maPhieu}</td>
                  <td className="p-3">{nguoi?.hoTen || '-'}</td>
                  <td className="p-3">{khoa?.tenKhoa || '-'}</td>
                  <td className="p-3 text-center">{r.chiTiet?.length || 0}</td>
                  <td className="p-3 text-center">
                     <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.trangThai]}`}>
                      {STATUS_MAP[r.trangThai]}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{r.ngayTao.slice(0,10)}</td>
                  {!isTruongKhoa && (
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                       {user?.vaiTro === 'ADMIN' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(r.maPhieu)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                       )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRequests.length === 0 && <div className="text-center py-12 text-muted-foreground">Không có dữ liệu yêu cầu</div>}
      </div>

      {/* CHI TIẾT YÊU CẦU DIALOG */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Chi tiết Phiếu Yêu Cầu: {viewing?.maPhieu}</DialogTitle></DialogHeader>
          {viewing && (
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/40 p-4 rounded-lg">
                  <p><span className="text-muted-foreground">Khoa yêu cầu:</span> {departments.find(k => k.maKhoa === viewing.maKhoa)?.tenKhoa}</p>
                  <p><span className="text-muted-foreground">Người tạo:</span> {users.find(u => u.maNguoiDung === viewing.maNguoiYeuCau)?.hoTen}</p>
                  <p className="col-span-2"><span className="text-muted-foreground">Lý do:</span> {viewing.lyDo}</p>
                  <p><span className="text-muted-foreground">Trạng thái:</span> <strong className={STATUS_COLORS[viewing.trangThai]}>{STATUS_MAP[viewing.trangThai]}</strong></p>
                </div>

                <div className="font-semibold text-sm">Danh sách thiết bị:</div>
                <div className="border rounded-md overflow-hidden max-h-[40vh] overflow-y-auto">
                   <table className="w-full text-sm">
                     <thead className="bg-muted sticky top-0"><tr>
                        <th className="p-2 text-left">Mã TB</th>
                        <th className="p-2 text-left">Tên TB</th>
                        <th className="p-2 text-center">SL Yêu cầu</th>
                        <th className="p-2 text-left">Hạn mượn</th>
                     </tr></thead>
                     <tbody>
                       {viewing.chiTiet?.map((item, idx) => {
                         const tb = equipment.find(e => e.maThietBi === item.maThietBi);
                         return (
                           <tr key={idx} className="border-t">
                              <td className="p-2 text-xs font-mono">{item.maThietBi}</td>
                              <td className="p-2">{tb?.tenThietBi}</td>
                              <td className="p-2 text-center font-bold text-primary">{item.soLuongYeuCau}</td>
                              <td className="p-2 text-xs text-muted-foreground">{item.hanMuon?.slice(0, 10) || 'Không'}</td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
                </div>

                {!isTruongKhoa && viewing.trangThai === 'CHO_DUYET' && user?.vaiTro==='ADMIN' && (
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => { setRejectingId(viewing.maPhieu); setRejectOpen(true); }}>Từ chối</Button>
                    <Button className="bg-success hover:bg-success/90" onClick={() => handleApprove(viewing.maPhieu)}>Duyệt phiếu</Button>
                  </div>
                )}
                
                {viewing.trangThai === 'DA_DUYET' && canAllocate && (
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleAllocate(viewing)}>
                       Tiến hành Xuất kho (Cấp phát)
                    </Button>
                  </div>
                )}
             </div>
          )}
        </DialogContent>
      </Dialog>

      {/* GIỎ HÀNG DIALOG */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Phiếu yêu cầu chờ tạo</DialogTitle></DialogHeader>
          <div className="space-y-4">
             <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3">
               {cart.map((item) => {
                 const tb = equipment.find(e => e.maThietBi === item.maThietBi);
                 const inv = inventory.find(i => i.maThietBi === item.maThietBi);
                 return (
                   <div key={item.maThietBi} className="flex flex-col sm:flex-row gap-4 p-3 border rounded-lg bg-card shadow-sm items-start sm:items-center">
                     <div className="flex-1">
                        <p className="font-semibold">{tb?.tenThietBi}</p>
                        <p className="text-xs text-muted-foreground">Tồn kho hiện tại: {inv?.soLuongKho}</p>
                     </div>
                     <div className="flex gap-4 items-end flex-wrap sm:flex-nowrap">
                       <div>
                         <Label className="text-xs">Số lượng</Label>
                         <Input 
                            type="number" min={1} max={inv?.soLuongKho} 
                            value={item.soLuongYeuCau} 
                            onChange={e => updateCartItem(item.maThietBi, 'soLuongYeuCau', parseInt(e.target.value)||1)} 
                            className="w-24 mt-1"
                         />
                       </div>
                       {tb?.loaiThietBi === 'Vật tư tái sử dụng' || tb?.loaiThietBi === 'Máy móc' ? (
                          <div>
                            <Label className="text-xs">Hạn mượn tối đa</Label>
                            <Input 
                                type="date" 
                                value={item.hanMuon} 
                                onChange={e => updateCartItem(item.maThietBi, 'hanMuon', e.target.value)} 
                                className="w-40 mt-1"
                            />
                          </div>
                       ) : null}
                       <Button variant="ghost" size="icon" className="text-destructive mt-auto" onClick={() => removeCartItem(item.maThietBi)}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 )
               })}
             </div>
             
             <div className="pt-4 border-t">
               <Label>Lý do cấp phát tổng thể *</Label>
               <Textarea placeholder="Vd: Cấp phát phục vụ đợt khám sức khỏe ngoại viện" value={reqReason} onChange={e => setReqReason(e.target.value)} className="mt-2" />
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setCartOpen(false)}>Hủy</Button>
             <Button onClick={submitCart} className="gradient-primary text-primary-foreground">Gửi Yêu Cầu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT DIALOG */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
           <DialogHeader><DialogTitle>Lý do từ chối</DialogTitle></DialogHeader>
           <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
           <DialogFooter>
             <Button variant="outline" onClick={() => setRejectOpen(false)}>Hủy</Button>
             <Button variant="destructive" onClick={handleReject}>Từ chối</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
