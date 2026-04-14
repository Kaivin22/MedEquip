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

export default function ReturnsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getReturns() || []);
  const [allocations, setAllocations] = useState(store.getAllocations() || []);
  const [search, setSearch] = useState('');
  
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
  const canConfirm = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';

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
      const isTuTieuHao = allocations.find(a => a.maPhieu === ct.maPhieuCapPhat)?.loaiThietBi === 'VAT_TU_TIEU_HAO';
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
             tinhTrangKhiTra: ct.tinhTrangKhiTra
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
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
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
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleConsume = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Xác nhận đã sử dụng/khấu trừ vật tư này? Vật tư sẽ được trừ khỏi danh sách mà không cần tạo phiếu trả.')) return;
    try {
      const result = await fetchApi(`/allocations/${id}/consume`, { method: 'PUT' });
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
    const phieuData = data.find(d => 
      (d.qrData && d.qrData.trim().toUpperCase() === cleanText) || 
      (d.maPhieuTra && d.maPhieuTra.trim().toUpperCase() === cleanText)
    );

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
      toast({ title: 'Lỗi', description: 'Không thể xử lý ảnh: ' + err.message, variant: 'destructive' });
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
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const toggleAllocationSelection = (alloc: PhieuCapPhat) => {
    setForm(prev => {
      const exists = prev.chiTiet.find(ct => ct.maPhieuCapPhat === alloc.maPhieu);
      if (exists) {
        return { ...prev, chiTiet: prev.chiTiet.filter(ct => ct.maPhieuCapPhat !== alloc.maPhieu) };
      } else {
        return {
          ...prev,
          chiTiet: [...prev.chiTiet, {
            maPhieuCapPhat: alloc.maPhieu,
            maThietBi: alloc.maThietBi,
            tenThietBi: alloc.tenThietBi || alloc.maThietBi,
            soLuong: alloc.soLuongCapPhat,
            tinhTrangKhiTra: 'DA_BOC_SEAL',
            anhMinhChung: undefined
          }]
        };
      }
    });
  };

  const filtered = data.filter(d => 
    d.maPhieuTra.toLowerCase().includes(search.toLowerCase()) || 
    (d.maPhieuCapPhat && d.maPhieuCapPhat.toLowerCase().includes(search.toLowerCase()))
  );

  const pendingAllocations = allocations.filter(a => 
    a.trangThaiTra === 'CHUA_TRA' && 
    (user?.vaiTro !== 'TRUONG_KHOA' || a.maNguoiMuon === user.maNguoiDung)
  );

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

      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Tìm mã phiếu trả..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
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
              {filtered.map(d => (
                <tr key={d.maPhieuTra} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs font-semibold">{d.maPhieuTra}</td>
                  <td className="p-3">{d.tenTruongKhoa}</td>
                  <td className="p-3 text-xs">{new Date(d.ngayTao).toLocaleString('vi-VN')}</td>
                  <td className="p-3">
                     <span className="font-semibold">{d.chiTiet.length}</span> thiết bị
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase 
                      ${d.trangThai === 'CHO_XAC_NHAN' ? 'bg-warning/10 text-warning' : 
                        d.trangThai === 'DA_TRA' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {d.trangThai === 'CHO_XAC_NHAN' ? 'Chờ xác nhận' : d.trangThai === 'DA_TRA' ? 'Đã nhập kho' : 'Bị từ chối'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setViewingPhieu(d); setDetailOpen(true); }} title="Xem chi tiết">
                        <Eye className="w-4 h-4 text-info" />
                      </Button>
                      {d.qrData && (
                        <Button variant="ghost" size="icon" onClick={() => { setQrDataStr(d.qrData!); setQrOpen(true); }} title="Mã QR">
                          <QrCode className="w-4 h-4 text-primary" />
                        </Button>
                      )}
                      {canConfirm && d.trangThai === 'CHO_XAC_NHAN' && (
                         <Button variant="ghost" size="icon" className="bg-primary/10 text-primary hover:bg-primary/20" onClick={() => { setConfirmingPhieu(d); setConfirmOpen(true); }} title="Duyệt">
                           <Check className="w-4 h-4" />
                         </Button>
                      )}
                      {user?.vaiTro === 'TRUONG_KHOA' && d.trangThai === 'CHO_XAC_NHAN' && (
                        <Button variant="ghost" size="icon" onClick={() => handleCancelReturn(d.maPhieuTra)} title="Hủy phiếu trả này">
                          <RotateCcw className="w-4 h-4 text-orange-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteReturn(d.maPhieuTra)} title="Xóa">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Không có dữ liệu phiếu trả.</div>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lập phiếu Trả Thiết bị</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Chọn các thiết bị muốn trả (Thiết bị đang mượn) *</Label>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto bg-muted/20">
                {pendingAllocations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Không có thiết bị nào đang mượn hoặc tất cả đã được yêu cầu trả.</div>
                ) : (
                  pendingAllocations.map(alloc => (
                    <div key={alloc.maPhieu} className="flex items-center p-3 gap-3 hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id={`check-${alloc.maPhieu}`}
                        checked={form.chiTiet.some(ct => ct.maPhieuCapPhat === alloc.maPhieu)}
                        onCheckedChange={() => toggleAllocationSelection(alloc)}
                      />
                      <label htmlFor={`check-${alloc.maPhieu}`} className="flex-1 cursor-pointer">
                        <div className="text-sm font-medium">{alloc.tenThietBi}</div>
                        <div className="text-[10px] text-muted-foreground flex gap-3">
                          <span>Mã CP: {alloc.maPhieu}</span>
                          <span className="font-bold text-primary">Số lượng mượn: {alloc.soLuongCapPhat} {alloc.donViTinh}</span>
                          {alloc.donViTinh !== alloc.donViCoSo && <span>(= {alloc.soLuongCoSo} {alloc.donViCoSo})</span>}
                          <span>Hạn trả: {new Date(alloc.ngayDuKienTra).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </label>
                      {alloc.loaiThietBi === 'VAT_TU_TIEU_HAO' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 pointer-events-auto"
                          onClick={(e) => handleConsume(alloc.maPhieu, e)}
                        >
                          Báo cáo đã dùng
                        </Button>
                      )}
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
                          Mã CP: {ct.maPhieuCapPhat} • Đơn vị trả: {allocations.find(a => a.maPhieu === ct.maPhieuCapPhat)?.donViTinh}
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-24">
                        <Label className="text-[10px] mb-1 block">Số lượng</Label>
                        <Input 
                          type="number" 
                          min={1} 
                          max={allocations.find(a => a.maPhieu === ct.maPhieuCapPhat)?.soLuongCapPhat || 1}
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
                            <SelectItem value="NGUYEN_SEAL">Nguyên seal</SelectItem>
                            {allocations.find(a => a.maPhieu === ct.maPhieuCapPhat)?.loaiThietBi !== 'VAT_TU_TIEU_HAO' && (
                              <SelectItem value="DA_BOC_SEAL">Đã bóc seal (Dùng tốt)</SelectItem>
                            )}
                            <SelectItem value="HONG">Hỏng / Cần sửa chữa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {allocations.find(a => a.maPhieu === ct.maPhieuCapPhat)?.loaiThietBi === 'VAT_TU_TIEU_HAO' && ct.tinhTrangKhiTra === 'NGUYEN_SEAL' && (
                        <div className="w-full sm:w-auto mt-2 sm:mt-0 flex flex-col gap-1">
                          <Label className="text-[10px] text-orange-600 font-semibold flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Ảnh minh chứng *
                          </Label>
                          {ct.anhMinhChung ? (
                            <div className="flex items-center justify-between gap-1 bg-success/10 text-success text-xs p-1 rounded border border-success/20 w-full sm:w-32">
                              <span className="flex items-center gap-1 truncate" title={ct.anhMinhChung}><Check className="w-3 h-3 shrink-0" /> <span className="truncate">{ct.anhMinhChung}</span></span>
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
                                  if (file) { setForm(prev => ({ ...prev, chiTiet: prev.chiTiet.map((it, i) => i === idx ? { ...it, anhMinhChung: file.name } : it) })); }
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
                      viewingPhieu.trangThai === 'DA_TRA' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {viewingPhieu.trangThai === 'CHO_XAC_NHAN' ? 'Chờ xác nhận' : viewingPhieu.trangThai === 'DA_TRA' ? 'Đã nhập kho' : 'Bị từ chối'}
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
                        <th className="text-left p-2">Tình trạng khi trả</th>
                        <th className="text-left p-2">Phiếu cấp phát</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingPhieu.chiTiet.map((ct, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-2 font-medium">{ct.tenThietBi}</td>
                          <td className="p-2 text-center">
                             <div className="font-bold text-primary">{(ct as any).soLuong} {(ct as any).donViTinh}</div>
                             {(ct as any).donViTinh !== (ct as any).donViCoSo && (
                                <div className="text-[9px] text-muted-foreground italic">= {(ct as any).soLuongCoSo} {(ct as any).donViCoSo}</div>
                             )}
                          </td>
                          <td className="p-2">
                            <span className={ct.tinhTrangKhiTra === 'HONG' ? 'text-destructive font-semibold' : ''}>
                              {TINH_TRANG_TRA_LABELS[ct.tinhTrangKhiTra]}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-muted-foreground">{ct.maPhieuCapPhat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingPhieu.ghiChu && (
                <div className="p-3 border rounded-lg bg-yellow-50/50">
                  <span className="text-[10px] text-muted-foreground block mb-1">Ghi chú:</span>
                  <p className="text-sm">{viewingPhieu.ghiChu}</p>
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
              size={200}
              fgColor="#000000"
              level="H"
            />
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
                    components={{ audio: false, finder: true }}
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
                      <span className="text-muted-foreground text-sm">Số lượng:</span> 
                      <span className="font-bold text-primary">{(ct as any).soLuong} {(ct as any).donViTinh}</span>
                    </div>
                    {(ct as any).donViTinh !== (ct as any).donViCoSo && (
                      <div className="flex justify-between text-[10px] italic text-muted-foreground">
                        <span>Quy đổi:</span>
                        <span>= {(ct as any).soLuongCoSo} {(ct as any).donViCoSo}</span>
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
    </div>
  );
}
