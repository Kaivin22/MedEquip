import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { apiDeleteImport } from '@/lib/apiSync';
import { ExcelPreviewRow } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Search, Trash2, Upload, FileDown, Check, AlertCircle } from 'lucide-react';
import { fetchApi } from '@/services/api';
import { refreshData } from '@/lib/dataLoader';

export default function ImportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getImports());
  const [search, setSearch] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ExcelPreviewRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCreate = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';
  const canDelete = user?.vaiTro === 'ADMIN';

  const suppliers = store.getSuppliers();
  const users = store.getUsers();

  const reload = async () => {
    await refreshData('imports');
    await refreshData('inventory');
    await refreshData('equipment');
    setData(store.getImports());
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/imports/template`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Không thể tải file');
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('File tải về bị trống (0 bytes). Vui lòng thử lại.');
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_nhap_kho.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      toast({ title: 'Lỗi', description: 'Chỉ chấp nhận file .xlsx', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/imports/from-excel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData
      });
      const result = await response.json();
      
      if (result.success) {
        setPreviewData(result.preview);
        setSummary(result.summary);
        setPreviewOpen(true);
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi đọc file', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    setUploading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/imports/confirm`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ rows: previewData })
      });
      const result = await response.json();
      
      if (result.success) {
        await reload();
        setPreviewOpen(false);
        toast({ title: 'Thành công', description: result.message });
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi server', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (maPhieu: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch sử này không?')) return;
    try {
      const result = await apiDeleteImport(maPhieu);
      if (result.success) {
        await reload();
        toast({ title: 'Đã xóa', description: `Đã xóa phiếu ${maPhieu}` });
      } else {
        toast({ title: 'Lỗi', description: result.message || 'Có lỗi xảy ra', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Lỗi kết nối', variant: 'destructive' });
    }
  };

  const filtered = data.filter(d => 
    d.maPhieu.toLowerCase().includes(search.toLowerCase()) ||
    d.maThietBi?.toLowerCase().includes(search.toLowerCase()) ||
    d.tenThietBi?.toLowerCase().includes(search.toLowerCase()) ||
    (d.tenNhaCungCap || suppliers.find(s => s.maNhaCungCap === d.maNhaCungCap)?.tenNhaCungCap)?.toLowerCase().includes(search.toLowerCase())
  );

  // Nhóm theo phiếu nhập
  const groupedImports = Object.values(
    filtered.reduce((acc, curr) => {
      if (!acc[curr.maPhieu]) {
        acc[curr.maPhieu] = { ...curr, chiTiet: [] };
      }
      if (curr.maThietBi) {
        acc[curr.maPhieu].chiTiet.push(curr);
      }
      return acc;
    }, {} as Record<string, any>)
  ).sort((a, b) => new Date(b.ngayNhap).getTime() - new Date(a.ngayNhap).getTime());

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border object-card">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Nhập kho bằng Excel
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Upload danh sách thiết bị để tự động cập nhật tồn kho (UPSERT logic)</p>
        </div>
        
        {canCreate && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={downloadTemplate} className="flex-1 sm:flex-none">
              <FileDown className="w-4 h-4 mr-2" /> Mẫu Excel
            </Button>
            <input 
              type="file" 
              accept=".xlsx" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
            />
            <Button 
              className="gradient-primary text-primary-foreground flex-1 sm:flex-none"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Đang xử lý...' : <><Upload className="w-4 h-4 mr-2" /> Chọn File Excel</>}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Lịch sử nhập kho</h3>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm mã phiếu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
        </div>
      </div>

      <div className="space-y-4">
        {groupedImports.map((phieu: any) => (
          <div key={phieu.maPhieu} className="border rounded-xl overflow-hidden bg-card">
            <div className="bg-muted/30 p-3 lg:px-4 border-b flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">{phieu.maPhieu}</span>
                <span className="text-xs text-muted-foreground">{new Date(phieu.ngayNhap).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs">
                  Người nhập: <span className="font-medium">{users.find(u => u.maNguoiDung === phieu.maNhanVienKho)?.hoTen || phieu.maNhanVienKho}</span>
                </span>
                {canDelete && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(phieu.maPhieu)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/10">
                  <th className="text-left p-2 pl-4 font-medium text-muted-foreground whitespace-nowrap">Mã TB</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Tên thiết bị</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Nhà cấp</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Lô/HSD</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Đơn giá</th>
                  <th className="text-right p-2 pr-4 font-medium text-muted-foreground">Số lượng</th>
                </tr></thead>
                <tbody>
                  {phieu.chiTiet.map((ct: any, idx: number) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="p-2 pl-4 font-mono text-xs">{ct.maThietBi}</td>
                      <td className="p-2">{ct.tenThietBi}</td>
                      <td className="p-2 text-xs truncate max-w-[150px]">{suppliers.find(s => s.maNhaCungCap === ct.maNhaCungCap)?.tenNhaCungCap}</td>
                      <td className="p-2 text-center text-xs">
                        {ct.soLo ? <span className="block">{ct.soLo}</span> : '-'}
                        {ct.hanSuDung ? <span className="block text-muted-foreground">{new Date(ct.hanSuDung).toLocaleDateString('vi-VN')}</span> : ''}
                      </td>
                      <td className="p-2 text-right text-xs">{ct.donGia ? ct.donGia.toLocaleString('vi-VN') + ' đ' : '-'}</td>
                      <td className="p-2 pr-4 text-right">
                        <span className="font-medium text-success whitespace-nowrap">+{ct.soLuongNhap} {ct.donViTinh}</span>
                        {ct.soLuongCoSo > 0 && ct.donViCoSo && ct.soLuongNhap !== ct.soLuongCoSo && (
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            Quy đổi: {ct.soLuongCoSo} {ct.donViCoSo}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/5 font-bold">
                    <td colSpan={4} className="p-2 pl-4 text-right text-muted-foreground uppercase text-[10px] tracking-wider">Tổng cộng giá trị phiếu:</td>
                    <td className="p-2 text-right text-amber-600 dark:text-amber-500">
                      {new Intl.NumberFormat('vi-VN').format(phieu.chiTiet.reduce((sum: number, ct: any) => sum + (ct.soLuongNhap * (ct.donGia || 0)), 0))} đ
                    </td>
                    <td className="p-2 pr-4 text-right text-success">
                      {phieu.chiTiet.reduce((sum: number, ct: any) => sum + ct.soLuongNhap, 0)} {phieu.chiTiet[0]?.donViTinh}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>

      {groupedImports.length === 0 && <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">Chưa có lịch sử nhập kho</div>}

      {/* Dialog Preview Excel */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Xem trước dữ liệu nhập kho</DialogTitle>
          </DialogHeader>
          
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-2 shrink-0">
              <div className="p-3 bg-muted rounded-lg border text-center">
                <div className="text-xl font-bold">{summary.total}</div>
                <div className="text-xs text-muted-foreground mt-1">Tổng dòng</div>
              </div>
              <div className="p-3 bg-success/10 text-success rounded-lg border border-success/20 text-center">
                <div className="text-xl font-bold">{summary.willCreate}</div>
                <div className="text-xs mt-1">Tạo mới (CREATE)</div>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-lg border border-primary/20 text-center">
                <div className="text-xl font-bold">{summary.willUpdate}</div>
                <div className="text-xs mt-1">Cập nhật (UPDATE)</div>
              </div>
              <div className={`p-3 rounded-lg border text-center ${summary.errors > 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-muted text-muted-foreground'}`}>
                <div className="text-xl font-bold">{summary.errors}</div>
                <div className="text-xs mt-1">Lỗi (Bỏ qua)</div>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg border border-amber-500/20 text-center font-mono">
                <div className="text-lg font-bold truncate" title={new Intl.NumberFormat('vi-VN').format(previewData.reduce((acc, r) => acc + (r.hasError ? 0 : r.soLuong * (r.donGia || 0)), 0)) + ' đ'}>
                  {new Intl.NumberFormat('vi-VN').format(previewData.reduce((acc, r) => acc + (r.hasError ? 0 : r.soLuong * (r.donGia || 0)), 0))} đ
                </div>
                <div className="text-xs mt-1">Tổng lô nhập</div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10 shadow-sm">
                <tr>
                  <th className="p-2 border-r text-center w-10">Dòng</th>
                  <th className="p-2 border-r text-center w-16">Thao tác</th>
                  <th className="p-2 border-r text-left">Mã TB</th>
                  <th className="p-2 border-r text-left">Tên TB & Loại</th>
                  <th className="p-2 border-r text-left">Nhà cung cấp</th>
                  <th className="p-2 border-r text-right w-12">SL</th>
                  <th className="p-2 border-r text-right w-24">Đơn giá</th>
                  <th className="p-2 border-r text-right w-28">Thành tiền</th>
                  <th className="p-2 text-left min-w-[200px]">Trạng thái / Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} className={`border-b ${row.hasError ? 'bg-destructive/5' : ''}`}>
                    <td className="p-2 border-r text-center text-muted-foreground">{row.rowIndex}</td>
                    <td className="p-2 border-r text-center">
                      {!row.hasError && row.action === 'CREATE' && <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded font-bold">CREATE</span>}
                      {!row.hasError && row.action === 'UPDATE' && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">UPDATE</span>}
                    </td>
                    <td className="p-2 border-r font-mono">{row.maThietBi}</td>
                    <td className="p-2 border-r">
                      <div className="font-semibold truncate max-w-[200px]" title={row.tenThietBi}>{row.tenThietBi}</div>
                      <div className="text-[10px] text-muted-foreground">{row.loai === 'TAI_SU_DUNG' ? 'Tái sử dụng' : 'Tiêu hao'}</div>
                    </td>
                    <td className="p-2 border-r truncate max-w-[120px]">{row.maNcc}</td>
                    <td className="p-2 border-r text-right font-medium text-success whitespace-nowrap">
                      +{row.soLuong} <span className="text-xs text-muted-foreground font-normal">{row.donViNhap || 'Hộp'}</span>
                      <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                        Thực nhập: {row.soLuong * (row.heSoQuyDoi || 1)} {row.donViCoSo}
                      </div>
                    </td>
                    <td className="p-2 border-r text-right font-mono text-[10px] sm:text-xs whitespace-nowrap">{row.donGia ? new Intl.NumberFormat('vi-VN').format(row.donGia) + ' đ' : '-'}</td>
                    <td className="p-2 border-r text-right font-mono text-[10px] sm:text-xs whitespace-nowrap font-semibold text-amber-600 dark:text-amber-500">
                      {row.donGia ? new Intl.NumberFormat('vi-VN').format(row.donGia * row.soLuong) + ' đ' : '-'}
                    </td>
                    <td className="p-2">
                      {row.hasError ? (
                        <div className="flex items-start text-destructive gap-1">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <ul className="list-disc pl-4 space-y-0.5">
                            {row.errors.map((e, j) => <li key={j}>{e}</li>)}
                          </ul>
                        </div>
                      ) : (
                        <span className="text-success flex items-center gap-1"><Check className="w-3 h-3" /> Hợp lệ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="shrink-0 mt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={uploading}>Hủy</Button>
            <Button 
              onClick={handleConfirmImport} 
              className="gradient-primary text-primary-foreground" 
              disabled={uploading || !summary || summary.valid === 0}
            >
              {uploading ? 'Đang xử lý...' : `Xác nhận nhập kho (${summary?.valid || 0} dòng)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
