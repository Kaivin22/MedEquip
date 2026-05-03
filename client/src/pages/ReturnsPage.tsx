import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { PhieuCapPhat, PhieuTraThietBi, TINH_TRANG_TRA_LABELS, TRANG_THAI_TRA_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { fetchApi } from '@/services/api';
import { refreshData } from '@/lib/dataLoader';
import { Plus, Search, QrCode, Check, X, RotateCcw, Camera, Upload, Keyboard, Trash2, Eye, Info } from 'lucide-react';
import { QRCodeCanvas as QRCodeComponent } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function ReturnsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getReturns() || []);
  const [allocations, setAllocations] = useState(store.getAllocations() || []);
  const [search, setSearch] = useState('');
  
  // Extension state
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendingAlloc, setExtendingAlloc] = useState<PhieuCapPhat | null>(null);
  const [extDate, setExtDate] = useState('');
  const [extReason, setExtReason] = useState('');

  // Due List state
  const [dueDialogOpen, setDueDialogOpen] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{
    ghiChu: string;
    chiTiet: {
      maPhieuCapPhat: string;
      maThietBi: string;
      tenThietBi: string;
      soLuong: number;
      tinhTrangKhiTra: 'NGUYEN_SEAL' | 'DA_BOC_SEAL' | 'HONG';
      anhMinhChung?: string;
    }[];
  }>({ ghiChu: '', chiTiet: [] });

  const [detailOpen, setDetailOpen] = useState(false);
  const [viewingPhieu, setViewingPhieu] = useState<PhieuTraThietBi | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataStr, setQrDataStr] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmingPhieu, setConfirmingPhieu] = useState<PhieuTraThietBi | null>(null);

  // Scanner state
  const [scanOpen, setScanOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const canCreate = user?.vaiTro === 'TRUONG_KHOA' || user?.vaiTro === 'ADMIN';
  const canConfirm = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN' || user?.vaiTro === 'QL_KHO';

  const dueAllocations = (allocations || []).filter(a => {
    if (!a) return false;
    const dueDate = a.ngayDuKienTra ? new Date(a.ngayDuKienTra) : null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    // Chỉ hiện những cái chưa trả hoặc đã gia hạn (đang mượn)
    // Loại bỏ YEU_CAU_TRA vì người dùng đã bấm trả/khai báo trả hoặc đang chờ gia hạn
    const isBorrowed = (a.trangThaiTra === 'CHUA_TRA' || a.trangThaiTra === 'DA_GIA_HAN');
    const isMine = (user?.vaiTro !== 'TRUONG_KHOA' || a.maNguoiMuon === user.maNguoiDung);

    // Thêm kiểm tra: Nếu đã có phiếu trả đang chờ xác nhận (CHO_XAC_NHAN) thì cũng không hiện ở đây
    const isInPendingReturn = (data || []).some(ret => 
      ret && ret.trangThai === 'CHO_XAC_NHAN' && 
      Array.isArray(ret.chiTiet) && ret.chiTiet.some((ct: any) => ct && ct.maPhieuCapPhat === a.maPhieu && ct.maThietBi === a.maThietBi)
    );

    return isBorrowed && isMine && !isInPendingReturn && dueDate && dueDate <= threeDaysLater;
  });

  const reload = async () => {
    try {
      const endpoint = user?.vaiTro === 'TRUONG_KHOA' ? '/returns/my' : '/returns';
      const returnsData = await fetchApi<any[]>(endpoint);
      if (Array.isArray(returnsData)) {
        store.setReturns(returnsData);
        setData(returnsData);
      }

      const resAlloc = await fetchApi<any[]>('/allocations');
      if (Array.isArray(resAlloc)) {
        store.setAllocations(resAlloc);
        setAllocations(resAlloc);
      } else if (resAlloc && (resAlloc as any).success) {
        store.setAllocations((resAlloc as any).data);
        setAllocations((resAlloc as any).data);
      }
      
      await refreshData('inventory');
    } catch (err: any) {
      console.error('Reload error:', err);
    }
  };

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancellingPhieu, setCancellingPhieu] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => { reload(); }, []);

  const handleCreateReturn = async () => {
    if (form.chiTiet.length === 0) { 
      toast({ title: 'Lỗi', description: 'Vui lòng chọn ít nhất một thiết bị để trả.', variant: 'destructive' }); 
      return; 
    }

    const invalid = form.chiTiet.some(ct => ct.soLuong <= 0);
    if (invalid) { 
      toast({ title: 'Lỗi', description: 'Số lượng trả phải lớn hơn 0.', variant: 'destructive' }); 
      return; 
    }

    const isValidMinhChung = form.chiTiet.every(ct => {
      const alloc = (allocations || []).find(a => a && a.maPhieu === ct.maPhieuCapPhat && a.maThietBi === ct.maThietBi);
      const isTuTieuHao = alloc?.loaiThietBi === 'VAT_TU_TIEU_HAO';
      if (isTuTieuHao && ct.tinhTrangKhiTra === 'NGUYEN_SEAL' && !ct.anhMinhChung) {
        return false;
      }
      return true;
    });

    if (!isValidMinhChung) {
      toast({ title: 'Lỗi', description: 'Vui lòng tải lên ảnh minh chứng nguyên seal cho vật tư tiêu hao.', variant: 'destructive' });
      return;
    }

    let finalGhiChu = form.ghiChu;
    const minhChungs = form.chiTiet.filter(ct => ct.anhMinhChung).map(ct => ct.tenThietBi);
    if (minhChungs.length > 0) {
      finalGhiChu += `\n[Đã đính kèm ảnh minh chứng nguyên seal cho: ${minhChungs.join(', ')}]`;
    }

    try {
      const result = await fetchApi<{ success: boolean; message: string; maPhieuTra: string }>('/returns/create', {
        method: 'POST',
        body: JSON.stringify({
          ghiChu: finalGhiChu,
          chiTiet: form.chiTiet.map(ct => ({
             maPhieuCapPhat: ct.maPhieuCapPhat,
             maThietBi: ct.maThietBi,
             soLuong: ct.soLuong,
             tinhTrangKhiTra: ct.tinhTrangKhiTra,
             anhMinhChung: ct.anhMinhChung
          }))
        })
      });
      if (result.success) {
        toast({ title: 'Thành công', description: 'Đã tạo Phiếu thông báo trả thiết bị.' });
        setDialogOpen(false);
        setQrDataStr(result.maPhieuTra);
        setQrOpen(true);
        reload();
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err?.message || 'Lỗi không xác định', variant: 'destructive' });
    }
  };

  const handleConfirmReturn = async (approved: boolean) => {
    if (!confirmingPhieu) return;
    try {
      const result = await fetchApi<{ success: boolean; message: string }>(`/returns/${confirmingPhieu.maPhieuTra}/confirm`, {
        method: 'PUT',
        body: JSON.stringify({ approved })
      });
      if (result.success) {
        toast({ title: 'Thành công', description: `Đã ${approved ? 'xác nhận nhập kho' : 'từ chối'} phiếu trả.` });
        setConfirmOpen(false);
        await reload();
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err?.message || 'Lỗi không xác định', variant: 'destructive' });
    }
  };

  const handleConsume = async (maPhieu: string, maThietBi: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Xác nhận đã sử dụng/khấu trừ vật tư này? Vật tư sẽ được trừ khỏi danh sách mà không cần tạo phiếu trả.')) return;
    try {
      const result = await fetchApi<{ success: boolean; message: string }>(`/allocations/${maPhieu}/consume`, { 
        method: 'PUT',
        body: JSON.stringify({ maThietBi })
      });
      if (result.success) {
        toast({ title: 'Thành công', description: result.message });
        reload();
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleScanQR = (text: string) => {
    if (!text) return;
    const cleanText = text.trim().toUpperCase();
    const phieuData = (data || []).find(d => {
      if (!d) return false;
      const q = d.qrData?.trim()?.toUpperCase();
      const m = d.maPhieuTra?.trim()?.toUpperCase();
      return (q === cleanText) || (m === cleanText);
    });

    if (phieuData) {
      if (phieuData.trangThai !== 'CHO_XAC_NHAN') {
         toast({ title: 'Cảnh báo', description: 'Phiếu này đã được xử lý (Trạng thái: ' + phieuData.trangThai + ')', variant: 'destructive' });
      } else {
         setConfirmingPhieu(phieuData);
         setConfirmOpen(true);
         setScanOpen(false); 
      }
    } else {
      toast({ 
        title: 'Không tìm thấy phiếu', 
        description: `Mã "${cleanText}" không khớp với bất kỳ phiếu trả nào đang chờ xác nhận trong danh sách của bạn.`, 
        variant: 'destructive' 
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!('BarcodeDetector' in window)) {
        toast({ 
          title: 'Trình duyệt không hỗ trợ', 
          description: 'Trình duyệt của bạn không hỗ trợ tự động quét ảnh. Vui lòng nhập mã thủ công.', 
          variant: 'destructive' 
        });
        return;
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();

      // @ts-ignore
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const [barcode] = await barcodeDetector.detect(img);

      if (barcode) {
        handleScanQR(barcode.rawValue);
      } else {
        toast({ title: 'Lỗi', description: 'Không tìm thấy mã QR trong ảnh này.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: 'Không thể xử lý ảnh: ' + (err?.message || 'Lỗi không xác định'), variant: 'destructive' });
    }
  };

  const handleDeleteReturn = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu trả này khỏi danh sách của bạn?')) return;
    try {
      const result = await fetchApi<{ success: boolean; message: string }>(`/returns/${id}`, {
        method: 'DELETE'
      });
      if (result.success) {
        toast({ title: 'Đã xóa', description: result.message });
        reload();
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleCancelReturn = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu trả này? Các thiết bị sẽ quay về trạng thái Đang mượn.')) return;
    try {
      const result = await fetchApi<{ success: boolean; message: string }>(`/returns/${id}/cancel`, {
        method: 'POST'
      });
      if (result.success) {
        toast({ title: 'Đã hủy', description: result.message });
        await reload();
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || "Lỗi khi hủy phiếu.", variant: 'destructive' });
    }
  };

  const handleExtendRequest = async () => {
    if (!extendingAlloc || !extDate || !extReason) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập đầy đủ thông tin.', variant: 'destructive' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newExtDate = new Date(extDate);
    newExtDate.setHours(0, 0, 0, 0);

    if (newExtDate <= today) {
      toast({ title: 'Lỗi', description: 'Ngày gia hạn phải sau ngày yêu cầu (ngày hiện tại).', variant: 'destructive' });
      return;
    }

    if (extendingAlloc.ngayDuKienTra) {
      const oldDate = new Date(extendingAlloc.ngayDuKienTra);
      oldDate.setHours(0, 0, 0, 0);
      if (newExtDate <= oldDate) {
        toast({ title: 'Lỗi', description: 'Ngày gia hạn không được trùng hoặc trước ngày trả hiện tại.', variant: 'destructive' });
        return;
      }
    }

    try {
      // Gửi yêu cầu gia hạn thông qua luồng Yêu cầu cấp phát
      const result = await fetchApi<{ success: boolean; message: string }>('/requests', {
        method: 'POST',
        body: JSON.stringify({ 
          maNguoiYeuCau: user?.maNguoiDung,
          maKhoa: user?.maKhoa,
          lyDo: `[GIA HẠN THIẾT BỊ] Phiếu mượn: ${extendingAlloc.maPhieu}. Lý do: ${extReason}`,
          maPhieuCapPhatCu: extendingAlloc.maPhieu, // Gắn ID phiếu cũ để NV Kho duyệt gia hạn
          items: [{
            maThietBi: extendingAlloc.maThietBi,
            soLuong: extendingAlloc.soLuongCapPhat,
            donVi: extendingAlloc.donViTinh,
            ngayTraDuKien: extDate
          }]
        })
      });

      if (result.success) {
        toast({ title: 'Thành công', description: 'Yêu cầu gia hạn đã được gửi tới NV Kho dưới dạng phiếu Yêu cầu cấp phát.' });
        setExtendOpen(false);
        setExtendingAlloc(null);
        setExtDate('');
        setExtReason('');
        await reload();
      } else {
        toast({ title: 'Lỗi', description: (result as any).message || 'Không thể gửi yêu cầu gia hạn.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err?.message || 'Lỗi khi gửi yêu cầu gia hạn.', variant: 'destructive' });
    }
  };

  const toggleAllocationSelection = (alloc: PhieuCapPhat) => {
    setForm(prev => {
      const exists = prev.chiTiet.find(ct => ct.maPhieuCapPhat === alloc.maPhieu && ct.maThietBi === alloc.maThietBi);
      if (exists) {
        return { ...prev, chiTiet: prev.chiTiet.filter(ct => !(ct.maPhieuCapPhat === alloc.maPhieu && ct.maThietBi === alloc.maThietBi)) };
      } else {
        return {
          ...prev,
          chiTiet: [...prev.chiTiet, {
            maPhieuCapPhat: alloc.maPhieu,
            maThietBi: alloc.maThietBi,
            tenThietBi: alloc.tenThietBi || alloc.maThietBi,
            soLuong: alloc.soLuongCapPhat,
            tinhTrangKhiTra: alloc.loaiThietBi === 'VAT_TU_TIEU_HAO' ? 'NGUYEN_SEAL' : 'DA_BOC_SEAL',
            anhMinhChung: undefined
          }]
        };
      }
    });
  };

  const filtered = (data || []).filter(d => {
    if (!d) return false;
    const s = search.toLowerCase();
    return (
      (d.maPhieuTra?.toLowerCase().includes(s)) ||
      (d.tenTruongKhoa?.toLowerCase().includes(s)) ||
      (d.maPhieuCapPhat?.toLowerCase().includes(s))
    );
  });

  const pendingAllocations = (allocations || []).filter(a => {
    if (!a) return false;
    const isBorrowed = (a.trangThaiTra === 'CHUA_TRA' || a.trangThaiTra === 'DA_GIA_HAN');
    const isMine = (user?.vaiTro !== 'TRUONG_KHOA' || a.maNguoiMuon === user.maNguoiDung);
    
    // ĐÃ TRẢ: Không hiển thị nếu đã có phiếu trả đang chờ xác nhận cho thiết bị này
    const isInPendingReturn = (data || []).some(ret => 
      ret && ret.trangThai === 'CHO_XAC_NHAN' && 
      Array.isArray(ret.chiTiet) && ret.chiTiet.some((ct: any) => ct && ct.maPhieuCapPhat === a.maPhieu && ct.maThietBi === a.maThietBi)
    );
    
    return isBorrowed && isMine && !isInPendingReturn;
  });

  const activeReturns = filtered.filter(d => d.trangThai === 'CHO_XAC_NHAN');
  const historyReturns = filtered.filter(d => d.trangThai !== 'CHO_XAC_NHAN');

  // Grouping by Ma Phieu for better UI
  const groupedAllocations = pendingAllocations.reduce((acc, curr) => {
    if (!curr || !curr.maPhieu) return acc;
    if (!acc[curr.maPhieu]) acc[curr.maPhieu] = [];
    acc[curr.maPhieu].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" /> Quản lý Trả thiết bị
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Trưởng khoa khai báo trả thiết bị, NV Kho quét mã hoặc xác nhận để tăng Tồn kho.</p>
        </div>
        <div className="flex gap-2">
          {canConfirm && (
            <Button onClick={() => setScanOpen(true)} className="bg-foreground text-background hover:bg-foreground/80">
              <Camera className="w-4 h-4 mr-2" /> Quét QR Nhập kho
            </Button>
          )}
          {user?.vaiTro === 'TRUONG_KHOA' && (
            <Button 
              variant="outline" 
              onClick={() => setDueDialogOpen(true)}
              className="relative border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              <Info className="w-4 h-4 mr-2" /> Thiết bị đến hạn
              {dueAllocations.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-pulse">
                  {dueAllocations.length}
                </span>
              )}
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => {
              setForm({ ghiChu: '', chiTiet: [] });
              setDialogOpen(true);
            }} className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Khai báo Trả thiết bị
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="active" className="relative">
              Phiếu đang xử lý
              {activeReturns.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                  {activeReturns.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Lịch sử trả thiết bị</TabsTrigger>
          </TabsList>
          
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Tìm mã phiếu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
          </div>
        </div>

        <TabsContent value="active" className="mt-0 space-y-4">
          <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Mã Phiếu Trả</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Người Trả</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Ngày Trả</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Số lượng mục</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReturns.map(d => {
                    if (!d) return null;
                    return (
                      <tr key={d.maPhieuTra} className="border-b hover:bg-muted/30 cursor-pointer group" onClick={() => { setViewingPhieu(d); setDetailOpen(true); }}>
                        <td className="p-3 font-mono text-xs font-bold group-hover:text-primary transition-colors">{d.maPhieuTra}</td>
                        <td className="p-3 font-medium">{d.tenTruongKhoa}</td>
                        <td className="p-3 text-xs text-muted-foreground">{d.ngayTao ? new Date(d.ngayTao).toLocaleString('vi-VN') : '---'}</td>
                        <td className="p-3 font-medium">{(d.chiTiet?.length || 0)} thiết bị</td>
                        <td className="p-3 text-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-warning/10 text-warning border border-warning/20">
                            Chờ xác nhận
                          </span>
                        </td>
                        <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setQrDataStr(d.maPhieuTra); setQrOpen(true); }} title="Mã QR">
                              <QrCode className="w-4 h-4 text-primary" />
                            </Button>
                            {canConfirm && (
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:bg-success/10" onClick={() => { setConfirmingPhieu(d); setConfirmOpen(true); }} title="Duyệt">
                                 <Check className="w-4 h-4" />
                               </Button>
                            )}
                            {user?.vaiTro === 'TRUONG_KHOA' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:bg-orange-50" onClick={() => { setCancellingPhieu(d); setCancelConfirmOpen(true); }} title="Hủy/Gia hạn">
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteReturn(d.maPhieuTra)} title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {activeReturns.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground bg-muted/5">Không có phiếu đang chờ xử lý.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0 space-y-4">
          <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Mã Trả</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Ngày Trả</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Ngày mượn</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Danh mục</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {historyReturns.map(d => {
                    if (!d) return null;
                    return (
                      <tr key={d.maPhieuTra} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => { setViewingPhieu(d); setDetailOpen(true); }}>
                        <td className="p-3 font-mono text-xs font-bold">{d.maPhieuTra}</td>
                        <td className="p-3 text-xs text-muted-foreground">{d.ngayTao ? new Date(d.ngayTao).toLocaleString('vi-VN') : '---'}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {(() => {
                             const firstItem = d.chiTiet?.[0];
                             if (!firstItem) return '---';
                             const alloc = (allocations || []).find(a => a && a.maPhieu === firstItem.maPhieuCapPhat && a.maThietBi === firstItem.maThietBi);
                             return alloc?.ngayCapPhat ? new Date(alloc.ngayCapPhat).toLocaleDateString('vi-VN') : '---';
                          })()}
                        </td>
                        <td className="p-3">
                          <div className="font-medium truncate max-w-[150px]">
                            {d.chiTiet?.[0]?.tenThietBi} {(d.chiTiet?.length || 0) > 1 ? `và ${d.chiTiet.length - 1} TB khác...` : ''}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase border", 
                            d.trangThai === 'DA_TRA' ? 'bg-success/10 text-success border-success/20' : 
                            d.trangThai === 'HUY' ? 'bg-muted text-muted-foreground border-border' : 
                            'bg-destructive/10 text-destructive border-destructive/20'
                          )}>
                            {d.trangThai === 'DA_TRA' ? 'Đã nhập kho' : d.trangThai === 'HUY' ? 'Đã hủy' : 'Bị từ chối'}
                          </span>
                        </td>
                        <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteReturn(d.maPhieuTra)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {historyReturns.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground bg-muted/5">Lịch sử trống.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lập phiếu Trả Thiết bị</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Chọn thiết bị mượn (Gồm cả thiết bị được gia hạn) *</Label>
              <div className="border rounded-lg divide-y max-h-80 overflow-y-auto bg-muted/20">
                {Object.keys(groupedAllocations).length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Không có thiết bị nào đang mượn.</div>
                ) : (
                  Object.entries(groupedAllocations).map(([maPhieu, items]) => (
                    <div key={maPhieu} className="p-1">
                      <div className="px-3 py-1.5 bg-muted font-bold text-[11px] text-muted-foreground uppercase flex justify-between items-center">
                         <span>Mã CP: {maPhieu}</span>
                         <span className={cn("text-[10px] font-medium italic", 
                            items?.[0]?.loaiThietBi === 'VAT_TU_TIEU_HAO' ? "text-orange-600" : 
                            (items?.[0]?.ngayDuKienTra && new Date(items[0].ngayDuKienTra) < new Date() ? "text-destructive" : "text-muted-foreground")
                          )}>
                            {items?.[0]?.loaiThietBi === 'VAT_TU_TIEU_HAO' 
                              ? 'Vật tư tiêu hao (Không trả, trừ khi lĩnh nhầm)' 
                              : (items[0].ngayDuKienTra ? `Hạn trả: ${new Date(items[0].ngayDuKienTra).toLocaleDateString('vi-VN')}` : 'Hạn trả: Không có hạn')}
                          </span>
                      </div>
                      {items.map(alloc => {
                        if (!alloc) return null;
                        const key = `${alloc.maPhieu}-${alloc.maThietBi}`;
                        return (
                          <div key={key} className="flex items-center p-3 gap-3 hover:bg-white/50 transition-colors">
                            <Checkbox 
                              id={`check-${key}`}
                              checked={form.chiTiet.some(ct => ct && ct.maPhieuCapPhat === alloc.maPhieu && ct.maThietBi === alloc.maThietBi)}
                              onCheckedChange={() => toggleAllocationSelection(alloc)}
                            />
                            <label htmlFor={`check-${key}`} className="flex-1 cursor-pointer">
                              <div className="text-sm font-medium">{alloc.tenThietBi}</div>
                              <div className="flex justify-between items-center w-full">
                                <div className="text-[10px] text-muted-foreground flex gap-3">
                                  <span className="font-bold text-primary">Mượn: {alloc.soLuongCapPhat} {alloc.donViTinh}</span>
                                  {alloc.soLuongCoSo !== alloc.soLuongCapPhat && (
                                    <span className="italic">(= {alloc.soLuongCoSo} {alloc.donViCoSo})</span>
                                  )}
                                </div>
                                <div className={cn("text-[10px] font-bold", 
                                  alloc.loaiThietBi === 'VAT_TU_TIEU_HAO' ? "text-orange-500" : 
                                  (alloc.ngayDuKienTra && new Date(alloc.ngayDuKienTra) < new Date() ? "text-destructive" : "text-muted-foreground")
                                )}>
                                  {alloc.loaiThietBi === 'VAT_TU_TIEU_HAO' ? 'Vật tư tiêu hao' : (alloc.ngayDuKienTra ? new Date(alloc.ngayDuKienTra).toLocaleDateString('vi-VN') : '')}
                                </div>
                              </div>
                            </label>
                            {alloc.loaiThietBi === 'VAT_TU_TIEU_HAO' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 pointer-events-auto"
                                onClick={(e) => handleConsume(alloc.maPhieu, alloc.maThietBi, e)}
                              >
                                Báo dùng
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>

            {form.chiTiet.length > 0 && (
              <div className="space-y-4">
                <Label>Chi tiết trạng thái & số lượng trả</Label>
                <div className="space-y-3">
                  {form.chiTiet.map((ct, idx) => (
                    <div key={ct.maPhieuCapPhat} className="bg-card p-3 rounded-lg border shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="flex-1 min-w-[150px]">
                        <div className="text-sm font-semibold text-primary">{ct.tenThietBi}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Mã CP: {ct.maPhieuCapPhat} • Đơn vị trả: {allocations.find(a => a && a.maPhieu === ct.maPhieuCapPhat)?.donViTinh || '---'}
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-24">
                        <Label className="text-[10px] mb-1 block">Số lượng</Label>
                        <Input 
                          type="number" 
                          min={1} 
                          max={allocations.find(a => a && a.maPhieu === ct.maPhieuCapPhat && a.maThietBi === ct.maThietBi)?.soLuongCapPhat || 9999}
                          value={ct.soLuong}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            setForm(prev => ({
                              ...prev,
                              chiTiet: prev.chiTiet.map((it, i) => i === idx ? { ...it, soLuong: val } : it)
                            }));
                          }}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="flex-1 w-full">
                        <Label className="text-[10px] mb-1 block">Tình trạng</Label>
                        <Select 
                          value={ct.tinhTrangKhiTra} 
                          onValueChange={(val: any) => {
                            setForm(prev => ({
                              ...prev,
                              chiTiet: prev.chiTiet.map((it, i) => i === idx ? { ...it, tinhTrangKhiTra: val } : it)
                            }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="NGUYEN_SEAL">Nguyên seal (Còn nguyên bao bì)</SelectItem>
                             {(() => {
                               const alloc = (allocations || []).find(a => a && a.maPhieu === ct.maPhieuCapPhat && a.maThietBi === ct.maThietBi);
                               return alloc?.loaiThietBi === 'TAI_SU_DUNG' && (
                                 <SelectItem value="DA_BOC_SEAL">Đã bóc seal (Dùng tốt)</SelectItem>
                               );
                             })()}
                             <SelectItem value="HONG">Hỏng / Cần sửa chữa</SelectItem>
                           </SelectContent>
                        </Select>
                      </div>

                      {allocations.find(a => a.maPhieu === ct.maPhieuCapPhat && a.maThietBi === ct.maThietBi)?.loaiThietBi === 'VAT_TU_TIEU_HAO' && ct.tinhTrangKhiTra === 'NGUYEN_SEAL' && (
                        <div className="w-full sm:w-auto mt-2 sm:mt-0 flex flex-col gap-1">
                          <Label className="text-[10px] text-orange-600 font-semibold flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Ảnh minh chứng *
                          </Label>
                          {ct.anhMinhChung ? (
                            <div className="flex items-center justify-between gap-1 bg-success/10 text-success text-xs p-1 rounded border border-success/20 w-full sm:w-32">
                              <span className="flex items-center gap-1 truncate" title={ct.anhMinhChung.length > 20 ? 'Ảnh đính kèm' : ct.anhMinhChung}><Check className="w-3 h-3 shrink-0" /> <span className="truncate">Đã tải ảnh lên</span></span>
                              <Button 
                                variant="ghost" size="icon" className="h-4 w-4 rounded-full hover:bg-success/20 hover:text-success shrink-0" 
                                onClick={(e) => { e.preventDefault(); setForm(prev => ({ ...prev, chiTiet: prev.chiTiet.map((it, i) => i === idx ? { ...it, anhMinhChung: undefined } : it) })); }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline" size="sm" className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 w-full sm:w-32"
                              onClick={(e) => {
                                e.preventDefault();
                                const input = document.createElement('input');
                                input.type = 'file'; input.accept = 'image/*';
                                input.onchange = (ev) => {
                                  const file = (ev.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setForm(prev => ({ ...prev, chiTiet: prev.chiTiet.map((it, i) => i === idx ? { ...it, anhMinhChung: reader.result as string } : it) }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                            >
                              <Upload className="w-3 h-3 mr-1" /> Tải lên
                            </Button>
                          )}
                        </div>
                      )}

                      <Button variant="ghost" size="icon" onClick={() => setForm(prev => ({ ...prev, chiTiet: prev.chiTiet.filter((_, i) => i !== idx) }))}>
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Ghi chú (Tùy chọn)</Label>
              <Textarea placeholder="Lý do trả, ghi chú thêm..." value={form.ghiChu} onChange={e => setForm(prev => ({ ...prev, ghiChu: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleCreateReturn} disabled={form.chiTiet.length === 0}>
              Tạo Phiếu Trả & Lấy mã QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Chi tiết Phiếu Trả {viewingPhieu?.maPhieuTra}</DialogTitle></DialogHeader>
          {viewingPhieu && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div><span className="text-muted-foreground">Mã phiếu:</span> <span className="font-mono ml-2">{viewingPhieu.maPhieuTra}</span></div>
                <div><span className="text-muted-foreground">Ngày tạo:</span> <span className="ml-2">{new Date(viewingPhieu.ngayTao).toLocaleString('vi-VN')}</span></div>
                <div><span className="text-muted-foreground">Người lập:</span> <span className="ml-2 font-medium">{viewingPhieu.tenTruongKhoa}</span></div>
                <div><span className="text-muted-foreground">Trạng thái:</span> 
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase 
                    ${viewingPhieu.trangThai === 'CHO_XAC_NHAN' ? 'bg-warning/10 text-warning' : 
                      viewingPhieu.trangThai === 'DA_TRA' ? 'bg-success/10 text-success' : 
                      viewingPhieu.trangThai === 'HUY' ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>
                    {viewingPhieu.trangThai === 'CHO_XAC_NHAN' ? 'Chờ xác nhận' : viewingPhieu.trangThai === 'DA_TRA' ? 'Đã nhập kho' : viewingPhieu.trangThai === 'HUY' ? 'Đã hủy' : 'Bị từ chối'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Info className="w-4 h-4" /> Danh sách thiết bị</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr className="border-b">
                        <th className="text-left p-2">Thiết bị</th>
                        <th className="text-center p-2">Số lượng</th>
                        <th className="text-left p-2">Ngày mượn</th>
                        <th className="text-left p-2">Tình trạng</th>
                        <th className="text-left p-2">Mã CP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingPhieu?.chiTiet || []).map((ct, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-2 font-medium">{ct.tenThietBi}</td>
                          <td className="p-2 text-center">
                             <div className="font-bold text-primary">{ct.soLuong} {ct.donViTinh}</div>
                             {ct.donViTinh !== ct.donViCoSo && (
                                <div className="text-[9px] text-muted-foreground italic">= {ct.soLuongCoSo} {ct.donViCoSo}</div>
                             )}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                             {(() => {
                               const alloc = (allocations || []).find(a => a && a.maPhieu === ct.maPhieuCapPhat && a.maThietBi === ct.maThietBi);
                               return alloc?.ngayCapPhat ? new Date(alloc.ngayCapPhat).toLocaleDateString('vi-VN') : '---';
                             })()}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col gap-1">
                              <span className={cn("text-[11px]", ct.tinhTrangKhiTra === 'HONG' ? 'text-destructive font-bold' : '')}>
                                {TINH_TRANG_TRA_LABELS[ct.tinhTrangKhiTra]}
                              </span>
                              {ct.anhMinhChung && (
                                <button type="button" onClick={() => setPreviewImage(ct.anhMinhChung)} className="flex items-center gap-1 text-primary text-[9px] hover:underline font-medium cursor-pointer bg-transparent border-none p-0 text-left">
                                  <Camera className="w-3 h-3" /> Xem ảnh
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-2 font-mono text-[10px] text-muted-foreground">{ct.maPhieuCapPhat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {(viewingPhieu.ghiChu || (viewingPhieu.chiTiet && viewingPhieu.chiTiet.some(ct => ct.anhMinhChung))) && (
                <div className="p-3 border rounded-lg bg-yellow-50/50 space-y-2">
                  {viewingPhieu.ghiChu && (
                    <>
                      <span className="text-[10px] text-muted-foreground block mb-1">Ghi chú:</span>
                      <p className="text-sm whitespace-pre-wrap">{viewingPhieu.ghiChu}</p>
                    </>
                  )}
                  {viewingPhieu.chiTiet && viewingPhieu.chiTiet.some(ct => ct.anhMinhChung) && (
                    <div className="pt-2 border-t border-yellow-200">
                      <span className="text-[10px] text-muted-foreground block mb-2">Ảnh minh chứng đính kèm:</span>
                      <div className="flex flex-wrap gap-2">
                        {viewingPhieu.chiTiet.filter(ct => ct.anhMinhChung).map((ct, idx) => (
                          <div key={idx} className="relative group rounded border bg-white p-1 shadow-sm">
                            <button type="button" onClick={() => setPreviewImage(ct.anhMinhChung)} className="block w-20 h-20 overflow-hidden rounded bg-transparent border-none p-0 cursor-pointer">
                              <img src={ct.anhMinhChung} alt={`Minh chứng ${ct.tenThietBi}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] p-1 truncate text-center" title={ct.tenThietBi}>
                              {ct.tenThietBi}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)} className="w-full">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm text-center flex flex-col items-center justify-center p-6 space-y-4">
          <DialogHeader><DialogTitle>Mã QR Phiếu Trả</DialogTitle></DialogHeader>
          <div className="bg-white p-4 rounded-xl shadow-inner border inline-block mt-4">
            <QRCodeComponent 
              value={qrDataStr} 
            />
          </div>
          <div className="font-mono text-sm font-bold bg-muted px-3 py-1 rounded border shadow-sm">
            Mã phiếu: {qrDataStr}
          </div>
          <p className="text-xs text-muted-foreground mt-2">NV Kho có thể quét mã này bằng điện thoại/máy quét để duyệt nhanh.</p>
          <Button variant="outline" onClick={() => setQrOpen(false)} className="w-full mt-4">Đóng</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={scanOpen} onOpenChange={(open) => { setScanOpen(open); if(!open) setManualCode(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nhận diện Phiếu Trả</DialogTitle></DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="overflow-hidden rounded-xl border bg-black aspect-video relative">
              {scanOpen && (
                  <Scanner
                    onScan={(detectedCodes) => {
                       if (detectedCodes && detectedCodes.length > 0) {
                          handleScanQR(detectedCodes[0].rawValue);
                       }
                    }}
                    formats={['qr_code']}
                    components={{ finder: true }}
                    styles={{ container: { width: '100%', height: '100%' } }}
                  />
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><Separator /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Hoặc sử dụng cách khác</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" onClick={() => document.getElementById('qr-file-input')?.click()}>
                <Upload className="h-6 w-6 text-primary" />
                <div className="text-xs">Tải ảnh QR lên</div>
                <input id="qr-file-input" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </Button>

              <div className="space-y-2">
                <Button variant="outline" className="flex flex-col h-auto py-4 gap-2 w-full" onClick={() => (document.getElementById('manual-input') as HTMLInputElement)?.focus()}>
                  <Keyboard className="h-6 w-6 text-muted-foreground" />
                  <div className="text-xs">Nhập mã thủ công</div>
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Input 
                id="manual-input"
                placeholder="Ví dụ: TRA-2026-12345" 
                value={manualCode} 
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScanQR(manualCode)}
              />
              <Button onClick={() => handleScanQR(manualCode)}>Tìm</Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScanOpen(false)} className="w-full">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận Nhập kho Trả Thiết bị</DialogTitle></DialogHeader>
          {confirmingPhieu && (
            <div className="space-y-4 my-2">
              <div className="p-4 bg-muted/40 rounded-lg space-y-2 border">
                <div className="flex justify-between"><span className="text-muted-foreground text-sm">Mã phiếu:</span> <span className="font-mono">{confirmingPhieu.maPhieuTra}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground text-sm">Người trả:</span> <span className="font-semibold">{confirmingPhieu.tenTruongKhoa}</span></div>
                {confirmingPhieu.chiTiet.map((ct, i) => (
                  <div key={i} className="pt-2 border-t mt-2">
                    <div className="flex justify-between"><span className="text-muted-foreground text-sm">Thiết bị:</span> <span className="font-medium text-right max-w-[200px]">{ct.tenThietBi}</span></div>
                    <div className="flex justify-between">
                       <span className="text-muted-foreground text-xs italic">Ngày mượn:</span>
                       <span className="text-xs">{(() => {
                         const alloc = (allocations || []).find(a => a && a.maPhieu === ct.maPhieuCapPhat && a.maThietBi === ct.maThietBi);
                         return alloc?.ngayCapPhat ? new Date(alloc.ngayCapPhat).toLocaleDateString('vi-VN') : '---';
                       })()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Số lượng:</span> 
                      <span className="font-bold text-primary">{ct.soLuong} {ct.donViTinh}</span>
                    </div>
                    {ct.donViTinh !== ct.donViCoSo && (
                      <div className="flex justify-between text-[10px] italic text-muted-foreground">
                        <span>Quy đổi:</span>
                        <span>= {ct.soLuongCoSo} {ct.donViCoSo}</span>
                      </div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground text-sm">Tình trạng:</span> <span className={`font-semibold ${ct.tinhTrangKhiTra === 'HONG' ? 'text-destructive' : 'text-success'}`}>{TINH_TRANG_TRA_LABELS[ct.tinhTrangKhiTra]}</span></div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">
                * Nếu xác nhận, thiết bị không hỏng sẽ được cộng vào <strong>Tồn Kho</strong>, thiết bị hỏng sẽ được cộng vào <strong>Số lượng hư</strong>. Phiếu cấp phát sẽ được đánh dấu <strong>Đã trả</strong>.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleConfirmReturn(false)} className="text-destructive hover:bg-destructive/10 border-destructive/20">Từ chối</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={() => handleConfirmReturn(true)}>Xác nhận & Nhập kho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DANH SÁCH ĐẾN HẠN */}
      <Dialog open={dueDialogOpen} onOpenChange={setDueDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b"><DialogTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-destructive" /> Thiết bị đến hạn / quá hạn trả</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {dueAllocations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Không có thiết bị nào đến hạn trong 3 ngày tới.</div>
            ) : (
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Thiết bị</th>
                      <th className="text-left p-3 font-medium">Ngày mượn</th>
                      <th className="text-left p-3 font-medium">Mã CP</th>
                      <th className="text-center p-3 font-medium">Hạn trả</th>
                      <th className="text-center p-3 font-medium">Trạng thái</th>
                      <th className="text-right p-3 font-medium">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dueAllocations.map(alloc => {
                      const isOverdue = new Date(alloc.ngayDuKienTra!) < new Date();
                      return (
                        <tr key={alloc.maPhieu + alloc.maThietBi} className={isOverdue ? 'bg-destructive/5' : ''}>
                          <td className="p-3">
                            <div className="font-bold">{alloc.tenThietBi}</div>
                            <div className="text-[10px] text-muted-foreground">{alloc.soLuongCapPhat} {alloc.donViTinh}</div>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{alloc.ngayCapPhat ? new Date(alloc.ngayCapPhat).toLocaleDateString('vi-VN') : '---'}</td>
                          <td className="p-3 font-mono text-xs">{alloc.maPhieu}</td>
                          <td className="p-3 text-center">
                            <span className={cn("px-2 py-1 rounded text-[10px] font-bold", isOverdue ? "bg-destructive text-white" : "bg-warning/20 text-warning-foreground")}>
                              {new Date(alloc.ngayDuKienTra!).toLocaleDateString('vi-VN')}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[10px] font-medium">{TRANG_THAI_TRA_LABELS[alloc.trangThaiTra]}</span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                               <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setExtendingAlloc(alloc); setExtDate(alloc.ngayDuKienTra!); setExtendOpen(true); }}>Gia hạn</Button>
                               <Button size="sm" className="gradient-primary h-8 text-xs text-white" onClick={() => { 
                                  setDueDialogOpen(false); 
                                  setForm({ ghiChu: '', chiTiet: [{
                                    maPhieuCapPhat: alloc.maPhieu,
                                    maThietBi: alloc.maThietBi,
                                    tenThietBi: alloc.tenThietBi || alloc.maThietBi,
                                    soLuong: alloc.soLuongCapPhat,
                                    tinhTrangKhiTra: alloc.loaiThietBi === 'VAT_TU_TIEU_HAO' ? 'NGUYEN_SEAL' : 'DA_BOC_SEAL',
                                  }] });
                                  setDialogOpen(true);
                               }}>Trả ngay</Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-muted/20">
            <Button variant="ghost" onClick={() => setDueDialogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL GIA HẠN */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Gửi yêu cầu Gia hạn mượn</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 block">Ngày gia hạn mới *</Label>
              <Input 
                type="date" 
                value={extDate} 
                onChange={e => setExtDate(e.target.value)} 
                min={extendingAlloc?.ngayDuKienTra 
                  ? new Date(Math.max(new Date(extendingAlloc.ngayDuKienTra).getTime() + 86400000, new Date().getTime() + 86400000)).toISOString().split('T')[0] 
                  : new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label className="mb-1 block">Lý do gia hạn *</Label>
              <Textarea 
                placeholder="VD: Dự án kéo dài thêm 1 tuần..." 
                value={extReason} 
                onChange={e => setExtReason(e.target.value)}
                className="h-24 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExtendOpen(false)}>Hủy</Button>
            <Button className="gradient-primary text-white" onClick={handleExtendRequest}>Gửi yêu cầu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-orange-500" /> Xử lý Phiếu Trả {cancellingPhieu?.maPhieuTra}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Bạn muốn thực hiện thao tác nào cho phiếu trả này?</p>
            
            <div className="border rounded-lg p-3 bg-muted/30">
               <div className="text-[10px] uppercase text-muted-foreground mb-2">Danh sách thiết bị trong phiếu:</div>
               {cancellingPhieu?.chiTiet?.map((ct: any, i: number) => (
                 <div key={i} className="text-xs space-y-1 pt-2 border-t first:border-0 first:pt-0">
                    <div className="flex justify-between font-medium">
                       <span>{ct.tenThietBi}</span>
                       <span className="font-bold text-primary">{ct.soLuong} {ct.donViTinh}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground italic">
                       <span>Ngày mượn: {(() => {
                         const alloc = (allocations || []).find(a => a && a.maPhieu === ct.maPhieuCapPhat && a.maThietBi === ct.maThietBi);
                         return alloc?.ngayCapPhat ? new Date(alloc.ngayCapPhat).toLocaleDateString('vi-VN') : '---';
                       })()}</span>
                       <span>Mã CP: {ct.maPhieuCapPhat}</span>
                    </div>
                 </div>
               ))}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3 px-4 flex flex-col items-start gap-1 border-orange-200 hover:bg-orange-50"
                onClick={() => {
                  const firstCt = cancellingPhieu?.chiTiet?.[0];
                  const alloc = allocations.find(a => a.maPhieu === firstCt?.maPhieuCapPhat);
                  if (alloc) {
                    setExtendingAlloc(alloc);
                    setExtDate(alloc.ngayDuKienTra ? new Date(alloc.ngayDuKienTra).toISOString().split('T')[0] : '');
                    setCancelConfirmOpen(false);
                    setExtendOpen(true);
                  }
                }}
              >
                <div className="font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Gia hạn thêm ngày trả</div>
                <div className="text-[10px] text-muted-foreground">Tiếp tục mượn và dời ngày trả cho thiết bị này</div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto py-3 px-4 flex flex-col items-start gap-1 border-destructive/20 hover:bg-destructive/5 text-destructive"
                onClick={() => {
                  handleCancelReturn(cancellingPhieu?.maPhieuTra);
                  setCancelConfirmOpen(false);
                }}
              >
                <div className="font-bold flex items-center gap-2"><X className="w-4 h-4" /> Hủy yêu cầu trả (vẫn mượn)</div>
                <div className="text-[10px] text-muted-foreground opacity-70">Xóa phiếu trả này và giữ trạng thái mượn</div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelConfirmOpen(false)} className="w-full">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img 
            src={previewImage} 
            alt="Phóng to minh chứng" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl bg-black/50" 
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
