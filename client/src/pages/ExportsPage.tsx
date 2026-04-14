import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Search, FileDown, Plus, Trash2, Eye, Box, PackageMinus, ChevronDown } from 'lucide-react';
import { refreshData } from '@/lib/dataLoader';

interface ExportItem {
  maThietBi: string;
  soLuong: number;
}

export default function ExportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(store.getExports());
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);

  // Form state
  const [lyDo, setLyDo] = useState('');
  const [items, setItems] = useState<ExportItem[]>([{ maThietBi: '', soLuong: 1 }]);

  const canCreate = user?.vaiTro === 'NV_KHO' || user?.vaiTro === 'ADMIN';

  const departments = store.getDepartments();
  const equipment = store.getEquipment();
  const inventory = store.getInventory();

  useEffect(() => {
    reload();
  }, []);

  const reload = async () => {
    await refreshData('exports');
    await refreshData('inventory');
    await refreshData('equipment');
    await refreshData('departments');
    setData(store.getExports());
  };

  // Lấy tồn kho của thiết bị
  const getTonKho = (maThietBi: string) => {
    const inv = inventory.find(i => i.maThietBi === maThietBi);
    return inv?.soLuongKho ?? null;
  };

  const getEquipmentName = (maThietBi: string) => {
    return equipment.find(e => e.maThietBi === maThietBi)?.tenThietBi || '';
  };

  // Thêm dòng thiết bị
  const addItem = () => {
    setItems(prev => [...prev, { maThietBi: '', soLuong: 1 }]);
  };

  // Xóa dòng thiết bị
  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Cập nhật dòng
  const updateItem = (idx: number, field: keyof ExportItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const resetForm = () => {
    setLyDo('');
    setItems([{ maThietBi: '', soLuong: 1 }]);
  };

  // Tạo phiếu xuất kho
  const handleCreate = async () => {
    // Validate
    const validItems = items.filter(i => i.maThietBi && i.soLuong > 0);
    if (validItems.length === 0) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn ít nhất một thiết bị với số lượng hợp lệ.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/exports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ lyDo, items: validItems })
      });

      let result: any;
      try {
        result = await response.json();
      } catch {
        throw new Error('Phản hồi từ server không hợp lệ.');
      }

      if (result.success) {
        await reload();
        setCreateOpen(false);
        resetForm();
        toast({ title: '✅ Thành công', description: result.message });
      } else {
        toast({ title: 'Lỗi', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi kết nối', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Xuất lịch sử ra Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/exports/excel`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Không thể xuất file');
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('File xuất bị trống.');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lich_su_xuat_kho.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast({ title: 'Thành công', description: 'Đã xuất file Excel lịch sử xuất kho.' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  // Nhóm theo phiếu xuất để hiển thị
  const filtered = data.filter(d =>
    d.maPhieu.toLowerCase().includes(search.toLowerCase()) ||
    (d.maThietBi || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.tenThietBi || '').toLowerCase().includes(search.toLowerCase())
  );

  const groupedExports = Object.values(
    filtered.reduce((acc, curr) => {
      if (!acc[curr.maPhieu]) {
        acc[curr.maPhieu] = { ...curr, chiTiet: [] };
      }
      if (curr.maThietBi) {
        (acc[curr.maPhieu] as any).chiTiet.push(curr);
      }
      return acc;
    }, {} as Record<string, any>)
  ).sort((a: any, b: any) => new Date(b.ngayXuat).getTime() - new Date(a.ngayXuat).getTime());

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PackageMinus className="w-5 h-5 text-primary" /> Xuất kho
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Tạo phiếu xuất kho, chọn thiết bị và số lượng cần xuất.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} disabled={exporting}>
            <FileDown className="w-4 h-4 mr-2" />
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </Button>
          {canCreate && (
            <Button className="gradient-primary text-primary-foreground" onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Tạo phiếu xuất
            </Button>
          )}
        </div>
      </div>

      {/* Search & list */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Lịch sử xuất kho</h3>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm mã phiếu, mã thiết bị, tên thiết bị..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Danh sách phiếu xuất */}
      <div className="space-y-4">
        {groupedExports.map((phieu: any) => (
          <div key={phieu.maPhieu} className="border rounded-xl overflow-hidden bg-card">
            <div className="bg-muted/30 p-3 lg:px-4 border-b flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {phieu.maPhieu}
                </span>
                <span className="text-xs text-muted-foreground">
                  {phieu.ngayXuat ? new Date(phieu.ngayXuat).toLocaleString('vi-VN') : '-'}
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                  {phieu.trangThai === 'DA_XUAT' ? 'Đã xuất' : phieu.trangThai}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {phieu.lyDoXuat && (
                  <span className="text-xs italic text-muted-foreground truncate max-w-[180px]">
                    "{phieu.lyDoXuat}"
                  </span>
                )}
              </div>
            </div>

            {phieu.chiTiet.length > 0 && (
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/10">
                      <th className="text-left p-2 pl-4 font-medium text-muted-foreground">Mã TB</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Tên thiết bị</th>
                      <th className="text-right p-2 pr-4 font-medium text-muted-foreground">Số lượng xuất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phieu.chiTiet.map((ct: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="p-2 pl-4 font-mono text-xs">{ct.maThietBi}</td>
                        <td className="p-2">{ct.tenThietBi}</td>
                        <td className="p-2 pr-4 text-right font-medium text-orange-600 dark:text-orange-400">
                          -{ct.soLuong} <span className="text-xs text-muted-foreground">{ct.donViTinh}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {groupedExports.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed">
          <Box className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Chưa có lịch sử xuất kho</p>
          <p className="text-sm mt-1">Nhấn "Tạo phiếu xuất" để bắt đầu</p>
        </div>
      )}

      {/* Dialog Tạo phiếu xuất */}
      <Dialog open={createOpen} onOpenChange={open => { if (!submitting) { setCreateOpen(open); if (!open) resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageMinus className="w-5 h-5 text-primary" />
              Tạo phiếu xuất kho
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-2 pr-1">
            {/* Thông tin chung */}
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Lý do xuất kho <span className="text-muted-foreground">(không bắt buộc)</span></label>
                <Input
                  placeholder="VD: Chuyển khỏi bệnh viện, hỗ trợ..."
                  value={lyDo}
                  onChange={e => setLyDo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Danh sách thiết bị xuất */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Danh sách thiết bị xuất <span className="text-destructive">*</span></label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Thêm thiết bị
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 bg-muted/50 border-b">
                  <div className="p-2 px-3 text-xs font-medium text-muted-foreground">Thiết bị</div>
                  <div className="p-2 px-3 text-xs font-medium text-muted-foreground text-center w-20">Tồn kho</div>
                  <div className="p-2 px-3 text-xs font-medium text-muted-foreground text-center w-24">Số lượng xuất</div>
                  <div className="p-2 px-3 w-10"></div>
                </div>

                {items.map((item, idx) => {
                  const tonKho = item.maThietBi ? getTonKho(item.maThietBi) : null;
                  const isOverStock = tonKho !== null && item.soLuong > tonKho;
                  return (
                    <div key={idx} className={`grid grid-cols-[1fr_auto_auto_auto] gap-0 border-b last:border-0 items-center ${isOverStock ? 'bg-destructive/5' : ''}`}>
                      {/* Chọn thiết bị */}
                      <div className="p-2 px-3">
                        <div className="relative">
                          <select
                            value={item.maThietBi}
                            onChange={e => updateItem(idx, 'maThietBi', e.target.value)}
                            className="w-full h-8 px-2 pr-7 rounded border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">-- Chọn thiết bị --</option>
                            {equipment.map(e => (
                              <option key={e.maThietBi} value={e.maThietBi}>
                                [{e.maThietBi}] {e.tenThietBi}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>
                        {item.maThietBi && getEquipmentName(item.maThietBi) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 pl-1">{getEquipmentName(item.maThietBi)}</p>
                        )}
                      </div>

                      {/* Tồn kho */}
                      <div className="p-2 px-3 text-center w-20">
                        {tonKho !== null ? (
                          <span className={`text-sm font-bold ${isOverStock ? 'text-destructive' : 'text-success'}`}>
                            {tonKho}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>

                      {/* Số lượng */}
                      <div className="p-2 px-3 w-24">
                        <Input
                          type="number"
                          min={1}
                          max={tonKho ?? undefined}
                          value={item.soLuong}
                          onChange={e => updateItem(idx, 'soLuong', parseInt(e.target.value) || 1)}
                          className={`h-8 text-center text-sm ${isOverStock ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                      </div>

                      {/* Xóa dòng */}
                      <div className="p-2 px-3 w-10">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(idx)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {items.some(i => i.maThietBi && getTonKho(i.maThietBi) !== null && i.soLuong > (getTonKho(i.maThietBi) ?? 0)) && (
                <p className="text-xs text-destructive flex items-center gap-1 pl-1">
                  ⚠ Một số thiết bị vượt quá tồn kho hiện có. Vui lòng điều chỉnh số lượng.
                </p>
              )}
            </div>

            {/* Tóm tắt */}
            {items.filter(i => i.maThietBi && i.soLuong > 0).length > 0 && (
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1.5">
                <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-2">Tóm tắt phiếu xuất</p>
                {items.filter(i => i.maThietBi && i.soLuong > 0).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{getEquipmentName(item.maThietBi) || item.maThietBi}</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">-{item.soLuong}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 shrink-0">
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }} disabled={submitting}>
              Hủy
            </Button>
            <Button
              className="gradient-primary text-white"
              onClick={handleCreate}
              disabled={submitting || items.filter(i => i.maThietBi && i.soLuong > 0).length === 0}
            >
              {submitting ? 'Đang xử lý...' : `Xác nhận xuất kho (${items.filter(i => i.maThietBi && i.soLuong > 0).length} thiết bị)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
