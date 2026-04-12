import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiCreateReturn, apiAcceptReturn } from '@/lib/apiSync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Search, QrCode, Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_MAP = { CHO_NHAN: 'Chờ nhận', DA_NHAN: 'Đã nhận', TU_CHOI: 'Từ chối' };
const STATUS_COLORS = { CHO_NHAN: 'bg-warning/10 text-warning', DA_NHAN: 'bg-success/10 text-success', TU_CHOI: 'bg-destructive/10 text-destructive' };

export default function ReturnsPage() {
  const { user } = useAuth();
  const [returns, setReturns] = useState(store.getReturns());
  const [search, setSearch] = useState('');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [equipSearch, setEquipSearch] = useState('');
  const [cart, setCart] = useState<{maThietBi: string, soLuongTra: number}[]>([]);
  
  const [qrOpen, setQrOpen] = useState(false);
  const [qrValue, setQrValue] = useState('');

  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');

  const equipment = store.getEquipment();
  const inventory = store.getInventory();
  const departments = store.getDepartments();
  const users = store.getUsers();

  const isTruongKhoa = user?.vaiTro === 'TRUONG_KHOA';
  const isKho = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';

  const inventoryAvailable = useMemo(() => {
    // Trong thực tế, Khoa nên chỉ trả thiết bị mà họ đang mượn (dựa vào phieu_cap_phat). 
    // Nhưng vì DB đơn giản, ta cho phép chọn từ thiết bị "Máy móc" hoặc "Vật tư tái sử dụng"
    return equipment.filter(e => 
      (e.loaiThietBi === 'Máy móc' || e.loaiThietBi === 'Vật tư tái sử dụng') &&
      (e.tenThietBi.toLowerCase().includes(equipSearch.toLowerCase()) || e.maThietBi.toLowerCase().includes(equipSearch.toLowerCase()))
    );
  }, [equipment, equipSearch]);

  const filteredReturns = useMemo(() => {
    let list = returns;
    if (isTruongKhoa) list = list.filter(r => r.maNguoiTra === user?.maNguoiDung);
    return list.filter(r => r.maPhieu.toLowerCase().includes(search.toLowerCase()));
  }, [returns, search, isTruongKhoa, user]);

  const addToCart = (maThietBi: string) => {
    if (cart.find(c => c.maThietBi === maThietBi)) return;
    setCart([...cart, { maThietBi, soLuongTra: 1 }]);
  };

  const createReturn = async () => {
    if (cart.length === 0) { toast({ title: 'Lỗi', variant: 'destructive', description: 'Chưa chọn thiết bị để trả' }); return; }
    
    try {
      const maKhoa = departments.find(k => k.tenKhoa.includes(user?.vaiTro || 'Khoa Nội'))?.maKhoa || departments[0].maKhoa;
      
      const payload = {
        maNguoiTra: user!.maNguoiDung,
        maKhoa,
        chiTiet: cart
      };

      const result = await apiCreateReturn(payload);
      if (result.success) {
        setReturns(store.getReturns());
        setDialogOpen(false);
        setCart([]);
        setQrValue(result.phieu.qrCode);
        setQrOpen(true);
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch(err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const acceptReturn = async () => {
    if(!scanCode) return;
    try {
      // scanCode thường là format "RETURN:PT-2026..."
      const maPhieu = scanCode.replace('RETURN:', '').trim();
      
      const result = await apiAcceptReturn({ maPhieuTra: maPhieu, maNguoiNhan: user!.maNguoiDung });
      if (result.success) {
        setReturns(store.getReturns());
        setScanOpen(false);
        setScanCode('');
        toast({ title: 'Thành công', description: 'Đã nhận lại thiết bị và cập nhật tồn kho.' });
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-lg shadow-sm">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm mã phiếu trả..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {isTruongKhoa && (
            <Button onClick={() => { setCart([]); setDialogOpen(true); }} className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Tạo Phiếu Trả
            </Button>
          )}
          {isKho && (
            <Button onClick={() => setScanOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <QrCode className="w-4 h-4 mr-2" /> Quét QR Nhận Hàng
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-card rounded-lg border shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Mã Phiếu</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Khoa trả</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Số lượng TB</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Ngày tạo</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Thao tác</th>
          </tr></thead>
          <tbody>
            {filteredReturns.map(r => {
              const khoa = departments.find(k => k.maKhoa === r.maKhoa);
              return (
                <tr key={r.maPhieu} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-3 font-mono text-xs text-primary font-medium">{r.maPhieu}</td>
                  <td className="p-3">{khoa?.tenKhoa || r.maKhoa}</td>
                  <td className="p-3 text-center">{r.chiTiet?.length || 0}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[r.trangThai]}`}>{STATUS_MAP[r.trangThai]}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{r.ngayTao.slice(0,10)}</td>
                  <td className="p-3 text-center">
                    {r.trangThai === 'CHO_NHAN' && isTruongKhoa && (
                      <Button variant="ghost" size="sm" onClick={() => { setQrValue(r.qrCode||''); setQrOpen(true); }} className="text-indigo-600">
                        <QrCode className="w-4 h-4 mr-1" /> Mã QR
                      </Button>
                    )}
                    {r.trangThai === 'DA_NHAN' && (
                       <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredReturns.length === 0 && <div className="text-center py-12 text-muted-foreground">Không có dữ liệu trả hàng</div>}
      </div>

      {/* TẠO PHIẾU TRẢ DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Lập phiếu trả thiết bị</DialogTitle></DialogHeader>
          
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            
            <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/20">
               <div className="p-3 border-b bg-muted/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Tìm thiết bị tái sử dụng..." value={equipSearch} onChange={e => setEquipSearch(e.target.value)} className="pl-10" />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-2">
                 {inventoryAvailable.map(e => (
                    <Card key={e.maThietBi} className="hover:border-primary/50 transition-colors shadow-sm">
                      <CardContent className="p-3 flex justify-between items-center">
                         <div>
                            <p className="font-semibold text-sm line-clamp-1">{e.tenThietBi}</p>
                            <p className="text-xs text-muted-foreground font-mono">{e.maThietBi}</p>
                         </div>
                         <Button size="sm" variant="outline" onClick={() => addToCart(e.maThietBi)}>Chọn</Button>
                      </CardContent>
                    </Card>
                 ))}
                 {inventoryAvailable.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">Không tìm thấy thiết bị</div>}
               </div>
            </div>

            <div className="flex flex-col border rounded-lg bg-card">
               <div className="p-3 border-b font-medium flex justify-between items-center">
                  <span>Thiết bị trả</span>
                  <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">{cart.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto p-3 ">
                 <div className="space-y-3">
                   {cart.map(c => {
                     const tb = equipment.find(e => e.maThietBi === c.maThietBi);
                     return (
                       <div key={c.maThietBi} className="flex flex-col sm:flex-row gap-3 p-3 border rounded items-start sm:items-center bg-muted/10">
                          <div className="flex-1">
                             <p className="font-medium text-sm line-clamp-1">{tb?.tenThietBi}</p>
                             <p className="text-xs text-muted-foreground text-primary">{tb?.loaiThietBi}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Input 
                               type="number" min={1} 
                               value={c.soLuongTra} 
                               onChange={e => setCart(cart.map(x => x.maThietBi === c.maThietBi ? {...x, soLuongTra: parseInt(e.target.value)||1}: x))} 
                               className="w-20 h-8"
                             />
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setCart(cart.filter(x => x.maThietBi !== c.maThietBi))}>
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                       </div>
                     )
                   })}
                   {cart.length===0 && <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">Chưa chọn thiết bị nào</div>}
                 </div>
               </div>
            </div>
            
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Đóng</Button>
            <Button onClick={createReturn} disabled={cart.length === 0} className="gradient-primary text-primary-foreground min-w-[120px]">Hoàn Tất Trả</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HIỂN THỊ QR */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm flex flex-col items-center justify-center p-8 text-center space-y-4">
           <DialogHeader><DialogTitle className="text-2xl font-bold">Mã Phiếu Trả</DialogTitle></DialogHeader>
           <p className="text-sm text-muted-foreground">Đưa mã QR này cho Nhân viên Kho để quét và xác nhận nhận thiết bị.</p>
           <div className="p-4 bg-white rounded-xl shadow-inner inline-block mx-auto border-2 border-primary/20">
             {qrValue && <QRCodeSVG value={qrValue} size={200} level="H" />}
           </div>
           <p className="font-mono bg-muted px-4 py-2 rounded-lg break-all text-xs">{qrValue}</p>
           <Button className="w-full mt-4" onClick={() => setQrOpen(false)}>Đóng</Button>
        </DialogContent>
      </Dialog>

      {/* QUÉT QR (NV KHO) */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
           <DialogHeader><DialogTitle>Quét Mã QR hoặc Nhập Mã Phiếu</DialogTitle></DialogHeader>
           <div className="p-8 text-center bg-muted/30 rounded-lg border-2 border-dashed border-primary/30 flex flex-col items-center justify-center space-y-4">
              <QrCode className="w-16 h-16 text-primary/50" />
              <p className="text-sm text-muted-foreground">Mô phỏng máy quét QR bằng cách nhập mã do phần mềm quét được.</p>
              <Input placeholder="RETURN:PT-..." value={scanCode} onChange={e => setScanCode(e.target.value)} className="w-full text-center font-mono" />
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setScanOpen(false)}>Hủy</Button>
             <Button onClick={acceptReturn} disabled={!scanCode}>Xác nhận Nhận Hàng</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
