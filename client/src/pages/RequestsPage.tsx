import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateRequest } from '@/lib/apiSync';
import { PhieuYeuCauCapPhat, ThietBi } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Search, CheckCheck, ShoppingCart, Plus, Minus, X, Trash2, Box } from 'lucide-react';
import { fetchApi } from '@/services/api';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const STATUS_MAP = { 
  CHO_DUYET: 'Chờ cấp phát', 
  TU_CHOI: 'Từ chối',
  DA_CAP_PHAT: 'Đã cấp phát'
} as const;

const STATUS_COLORS = { 
  CHO_DUYET: 'bg-warning/10 text-warning border-warning/20', 
  TU_CHOI: 'bg-destructive/10 text-destructive border-destructive/20',
  DA_CAP_PHAT: 'bg-success/10 text-success border-success/20'
};

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(store.getRequests());
  const [search, setSearch] = useState('');
  const [searchEq, setSearchEq] = useState('');
  
  // Custom filter
  const [filterDept, setFilterDept] = useState('all');

  // Cart state
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<{tb: ThietBi, soLuong: number}[]>([]);
  const [lyDo, setLyDo] = useState('');
  const [khoaYeuCau, setKhoaYeuCau] = useState(user?.maKhoa || '');

  // NV Kho Allocating
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocating, setAllocating] = useState<PhieuYeuCauCapPhat | null>(null);
  const [ngayDuKienTra, setNgayDuKienTra] = useState('');

  // NV Kho Rejecting
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const equipment = store.getEquipment();
  const departments = store.getDepartments();
  const users = store.getUsers();
  const inventory = store.getInventory();

  const isNvkho = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';
  const isKhoa = user?.vaiTro === 'TRUONG_KHOA';

  const eqFiltered = useMemo(() => {
    return equipment.filter(e => 
      e.trangThai && (e.tenThietBi.toLowerCase().includes(searchEq.toLowerCase()) || e.maThietBi.toLowerCase().includes(searchEq.toLowerCase()))
    );
  }, [equipment, searchEq]);

  const reqFiltered = useMemo(() => {
    let list = requests;
    if (isKhoa) list = list.filter(r => r.maNguoiYeuCau === user!.maNguoiDung);
    
    return list.filter(r => {
      const matchSearch = r.maPhieu.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === 'all' || r.maKhoa === filterDept;
      return matchSearch && matchDept;
    });
  }, [requests, search, isKhoa, user, filterDept]);

  // Handle Cart logic
  const addToCart = (tb: ThietBi) => {
    setCart(prev => {
      const existing = prev.find(item => item.tb.maThietBi === tb.maThietBi);
      if (existing) {
        return prev.map(item => item.tb.maThietBi === tb.maThietBi ? { ...item, soLuong: item.soLuong + 1 } : item);
      }
      return [...prev, { tb, soLuong: 1 }];
    });
    toast({ title: 'Đã thêm vào giỏ', description: `${tb.tenThietBi}` });
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.tb.maThietBi !== id));
    else setCart(prev => prev.map(i => i.tb.maThietBi === id ? { ...i, soLuong: qty } : i));
  };

  const submitCart = async () => {
    if (cart.length === 0) return toast({ title: 'Lỗi', description: 'Giỏ hàng rỗng.', variant: 'destructive' });
    if (!khoaYeuCau && isKhoa && !departments.find(k=>k.maKhoa === khoaYeuCau)) {
        toast({ title: 'Lỗi', description: 'Vui lòng chọn khoa của bạn hợp lệ.', variant: 'destructive' }); return;
    }
    if (!lyDo) return toast({ title: 'Lỗi', description: 'Vui lòng nhập lý do (vd: Phục vụ phòng mổ).', variant: 'destructive' });

    let hasError = false;
    for (const item of cart) {
      const inv = inventory.find(i => i.maThietBi === item.tb.maThietBi);
      if (!inv || item.soLuong > inv.soLuongKho) {
        toast({ title: 'Tồn kho không đủ', description: `${item.tb.tenThietBi} chỉ còn ${inv?.soLuongKho || 0} món.`, variant: 'destructive' });
        hasError = true; break;
      }
    }
    if (hasError) return;

    try {
      for (const item of cart) {
        await apiCreateRequest({
          maNguoiYeuCau: user!.maNguoiDung,
          maThietBi: item.tb.maThietBi,
          maKhoa: isKhoa ? user?.maKhoa : khoaYeuCau,
          soLuongYeuCau: item.soLuong,
          lyDo
        } as any);
      }
      const resList = await fetchApi<any[]>('/requests');
      if (resList.success) {
        store.setRequests(resList.data);
        setRequests([...resList.data]);
      }
      setCartOpen(false);
      setCart([]);
      setLyDo('');
      toast({ title: 'Thành công', description: `Đã gửi yêu cầu cấp phát.` });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const submitAllocate = async () => {
    if (!allocating) return;
    const tb = equipment.find(e => e.maThietBi === allocating.maThietBi);
    if (!tb) return;

    if (tb.loaiThietBi === 'TAI_SU_DUNG' && !ngayDuKienTra) {
      toast({ title: 'Lỗi', description: 'Thiết bị tái sử dụng cần có Ngày dự kiến trả.', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({
          maPhieuYeuCau: allocating.maPhieu,
          maNhanVienKho: user!.maNguoiDung,
          maThietBi: allocating.maThietBi,
          maNguoiMuon: allocating.maNguoiYeuCau,
          maKhoa: allocating.maKhoa,
          soLuongCapPhat: allocating.soLuongYeuCau,
          ghiChu: 'Duyệt cấp phát',
          ngayDuKienTra: (tb.loaiThietBi === 'TAI_SU_DUNG' && ngayDuKienTra) ? ngayDuKienTra : undefined
        })
      });
      const result = await response.json();

      if (result.success) {
        const resList = await fetchApi<any[]>('/requests');
        if (resList.success) {
          store.setRequests(resList.data);
          setRequests([...resList.data]);
        }
        const resAlloc = await fetchApi<any[]>('/allocations');
        if (resAlloc.success) store.setAllocations(resAlloc.data);
        const resInv = await fetchApi<any[]>('/inventory');
        if (resInv.success) store.setInventory(resInv.data);

        setAllocateOpen(false);
        toast({ title: 'Cấp phát thành công' });
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!rejectReason) return toast({ title: 'Lỗi', description: 'Nhập lý do từ chối', variant: 'destructive' });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/requests/${rejectingId}/approve-dept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ approved: false, lyDo: rejectReason })
      });
      const result = await response.json();
      if (result.success) {
        const resList = await fetchApi<any[]>('/requests');
        if (resList.success) {
          store.setRequests(resList.data);
          setRequests([...resList.data]);
        }
        setRejectOpen(false);
        toast({ title: 'Đã từ chối phiếu.' });
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Lỗi' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in relative min-h-[80vh]">
      <Tabs defaultValue={isKhoa ? "catalog" : "history"} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-2 rounded-xl border mb-4 shadow-sm gap-4 relative">
          <TabsList className="bg-muted">
            {isKhoa && <TabsTrigger value="catalog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Danh mục TB (Yêu cầu cấp phát)</TabsTrigger>}
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {isKhoa ? "Lịch sử Yêu cầu" : "Danh sách Yêu cầu"}  
            </TabsTrigger>
          </TabsList>
          
          {isKhoa && (
            <Button onClick={() => setCartOpen(true)} className="gradient-primary text-primary-foreground shadow-md mr-2 relative">
              <ShoppingCart className="w-4 h-4 mr-2" /> Giỏ hàng yêu cầu
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-in zoom-in">
                  {cart.length}
                </span>
              )}
            </Button>
          )}
        </div>

        {isKhoa && (
          <TabsContent value="catalog" className="mt-0">
            <div className="flex items-center mb-4">
              <div className="relative max-w-sm w-full shadow-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Tìm thiết bị trong kho..." value={searchEq} onChange={e => setSearchEq(e.target.value)} className="pl-10" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {eqFiltered.map(tb => {
                const maxKho = inventory.find(i => i.maThietBi === tb.maThietBi)?.soLuongKho || 0;
                return (
                  <div key={tb.maThietBi} className="bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                    <div className="aspect-square bg-muted/30 relative flex border-b">
                      {tb.hinhAnh ? (
                        <img src={tb.hinhAnh} className="object-cover w-full h-full" alt={tb.tenThietBi} />
                      ) : (
                        <div className="m-auto text-muted-foreground flex flex-col items-center gap-2">
                          <Box className="w-12 h-12 opacity-20" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold shadow-sm ${maxKho > 0 ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                          Tồn: {maxKho}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <h4 className="font-bold text-sm line-clamp-1 mb-1 group-hover:text-primary transition-colors" title={tb.tenThietBi}>{tb.tenThietBi}</h4>
                      <p className="text-[10px] font-mono text-muted-foreground mb-2">{tb.maThietBi} • {tb.loaiThietBi === 'TAI_SU_DUNG' ? 'Tái sử dụng' : 'Khấu hao'}</p>
                      <div className="mt-auto pt-2">
                        <Button 
                          onClick={() => addToCart(tb)} 
                          disabled={maxKho <= 0} 
                          className="w-full text-xs h-8"
                          variant={maxKho > 0 ? 'default' : 'secondary'}
                        >
                          {maxKho > 0 ? (cart.some(c=>c.tb.maThietBi===tb.maThietBi)? 'Thêm tiếp' : 'Thêm vào giỏ') : 'Hết hàng'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {eqFiltered.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">Không tìm thấy thiết bị nào trong kho.</div>}
            </div>
          </TabsContent>
        )}

        <TabsContent value="history" className="mt-0">
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Tìm mã phiếu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            {isNvkho && (
              <SearchableSelect 
                options={[{ value: 'all', label: 'Tất cả khoa' }, ...departments.map(k => ({ value: k.maKhoa, label: k.tenKhoa }))]} 
                value={filterDept} 
                onValueChange={setFilterDept} 
                placeholder="Lọc theo khoa"
              />
            )}
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Mã YC</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Khoa</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Thiết bị</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">SL</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Ngày YC</th>
                  {isNvkho && <th className="text-right p-3 font-medium text-muted-foreground">Xử lý (NV Kho)</th>}
                </tr></thead>
                <tbody>
                  {reqFiltered.map(r => {
                    const tb = equipment.find(e => e.maThietBi === r.maThietBi);
                    const khoa = departments.find(k => k.maKhoa === r.maKhoa);
                    return (
                      <tr key={r.maPhieu} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs">{r.maPhieu}</td>
                        <td className="p-3">{khoa?.tenKhoa || r.maKhoa}</td>
                        <td className="p-3 font-medium text-primary">
                          {tb?.tenThietBi || r.maThietBi}
                          <span className="block text-[10px] text-muted-foreground mt-0.5">{tb?.loaiThietBi === 'TAI_SU_DUNG' ? 'Tái sử dụng' : 'Khấu hao'}</span>
                        </td>
                        <td className="p-3 text-center font-bold">{r.soLuongYeuCau}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${STATUS_COLORS[(r.trangThai as keyof typeof STATUS_COLORS)] || 'bg-muted'}`}>
                            {STATUS_MAP[r.trangThai as keyof typeof STATUS_MAP] || r.trangThai}
                          </span>
                          {r.trangThai === 'TU_CHOI' && (
                            <div className="text-[10px] text-destructive mt-1 truncate max-w-[150px] mx-auto italic">{r.lyDoTuChoi}</div>
                          )}
                        </td>
                        <td className="p-3 text-center text-xs text-muted-foreground">{new Date(r.ngayTao).toLocaleString('vi-VN')}</td>
                        {isNvkho && (
                          <td className="p-3 text-right">
                            {r.trangThai === 'CHO_DUYET' ? (
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="default" className="h-7 text-xs bg-success hover:bg-success/90 text-white" onClick={() => { setAllocating(r); setNgayDuKienTra(''); setAllocateOpen(true); }}>Cấp phát</Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => { setRejectingId(r.maPhieu); setRejectReason(''); setRejectOpen(true); }}>Từ chối</Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground mr-2">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {reqFiltered.length === 0 && <div className="text-center py-12 text-muted-foreground">Không có dữ liệu yêu cầu.</div>}
          </div>
        </TabsContent>
      </Tabs>

      {/* CART MODAL (TRUONG_KHOA) */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b shadow-sm z-10 bg-card"><DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> Giỏ hàng yêu cầu cấp phát</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto bg-muted/10 p-5 space-y-5">
            {cart.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground border-2 border-dashed bg-card rounded-xl">Không có thiết bị trong giỏ. Vui lòng thêm từ mục Danh mục.</div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, idx) => {
                  const maxKho = inventory.find(i => i.maThietBi === item.tb.maThietBi)?.soLuongKho || 0;
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border rounded-xl p-3 bg-card shadow-sm gap-3">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded bg-muted/40 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {item.tb.hinhAnh ? <img src={item.tb.hinhAnh} className="object-cover w-full h-full" alt=""/> : <Box className="w-5 h-5 text-muted-foreground/30"/>}
                        </div>
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-sm truncate">{item.tb.tenThietBi}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{item.tb.maThietBi} • Tồn: {maxKho}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 border bg-muted/20 p-1 rounded-lg w-full sm:w-auto justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded" onClick={() => updateCartQty(item.tb.maThietBi, item.soLuong - 1)}><Minus className="w-3 h-3" /></Button>
                        <Input 
                          type="number" 
                          className="w-12 h-7 text-center font-bold bg-transparent border-0 focus-visible:ring-0 p-0 text-primary" 
                          value={item.soLuong} 
                          onChange={e => updateCartQty(item.tb.maThietBi, parseInt(e.target.value) || 0)} 
                          min={0} max={maxKho}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded" onClick={() => updateCartQty(item.tb.maThietBi, item.soLuong + 1)} disabled={item.soLuong >= maxKho}><Plus className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {cart.length > 0 && (
              <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm mt-4">
                <h3 className="font-bold text-sm border-b pb-2">Thông tin người yêu cầu</h3>
                <div className="grid gap-4">
                  {!isKhoa && (
                    <div>
                      <Label className="mb-1 block text-muted-foreground">Khoa nhận cấp phát <span className="text-destructive">*</span></Label>
                      <SearchableSelect 
                        options={departments.map(k => ({ value: k.maKhoa, label: k.tenKhoa }))} 
                        value={khoaYeuCau} 
                        onValueChange={setKhoaYeuCau} 
                        placeholder="Tìm và Chọn khoa"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="mb-1 block text-muted-foreground">Lý do nhận / Yêu cầu thêm <span className="text-destructive">*</span></Label>
                    <Textarea value={lyDo} onChange={e => setLyDo(e.target.value)} placeholder="Nhập mục đích sử dụng..." className="h-20 resize-none z-10 relative" style={{ isolation: 'isolate' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-card z-10">
            <Button variant="ghost" onClick={() => setCartOpen(false)}>Đóng</Button>
            <Button className="gradient-primary text-white shadow-md" onClick={submitCart} disabled={cart.length === 0}>Gửi Yêu Cầu Cấp Phát</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NVKHO: ALLOCATE MODAL */}
      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tiến hành Cấp phát</DialogTitle></DialogHeader>
          {allocating && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm border">
                <div className="flex justify-between"><span className="text-muted-foreground">Khoa yêu cầu:</span> <strong>{departments.find(k => k.maKhoa === allocating.maKhoa)?.tenKhoa}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Thiết bị thiết yếu:</span> <strong>{equipment.find(e => e.maThietBi === allocating.maThietBi)?.tenThietBi}</strong></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Số lượng cấp phát:</span> <span className="bg-success text-success-foreground px-2 py-0.5 rounded text-lg font-bold">{allocating.soLuongYeuCau}</span></div>
                <div className="pt-2 border-t mt-2">
                  <span className="text-muted-foreground text-xs block mb-1">Lý do mượn:</span>
                  <div className="text-sm font-medium">{allocating.lyDo}</div>
                </div>
              </div>
              
              {(() => {
                const tb = equipment.find(e => e.maThietBi === allocating.maThietBi);
                if (tb?.loaiThietBi === 'TAI_SU_DUNG') {
                  return (
                    <div className="border border-warning bg-warning/5 p-4 rounded-lg">
                      <Label className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-2 mb-2">
                        <CheckCheck className="w-4 h-4" /> Bắt buộc hẹn ngày trả (Thiết bị Tái sử dụng)
                      </Label>
                      <Input type="date" value={ngayDuKienTra} onChange={e => setNgayDuKienTra(e.target.value)} className="border-warning/50 focus-visible:ring-warning" />
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <p className="font-semibold text-primary">Vật tư cấp phát hoàn toàn</p>
                      <p className="text-xs text-primary/70">Không cần hẹn ngày trả vì đây là vật tư tiêu hao.</p>
                    </div>
                  );
                }
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateOpen(false)}>Hủy bỏ</Button>
            <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={submitAllocate}>Xác nhận Xuất kho cấp phát</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT MODAL */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><X className="w-5 h-5"/> Từ chối cấp phát</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-muted-foreground">Ghi rõ lý do tại sao không thể cấp thiết bị này cho trưởng khoa:</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="VD: Hết hàng tạm thời, sai thông số yêu cầu..." rows={4} className="resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Quay lại</Button>
            <Button variant="destructive" onClick={handleReject}>Gửi phản hồi Từ chối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
