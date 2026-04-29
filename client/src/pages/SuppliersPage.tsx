import React, { useState, useMemo } from 'react';
import { store } from '@/lib/store';
import { NhaCungCap, LOAI_THIET_BI_LABELS } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';

export default function SuppliersPage() {
  const [data] = useState(store.getSuppliers());
  const [equipment] = useState(store.getEquipment());
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<NhaCungCap | null>(null);

  const filtered = useMemo(() =>
    data.filter(s => s.tenNhaCungCap.toLowerCase().includes(search.toLowerCase()) || s.maNhaCungCap.toLowerCase().includes(search.toLowerCase())), [data, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm nhà cung cấp..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10"></th>
              <th className="text-left p-4 font-medium text-muted-foreground">Mã NCC</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Tên NCC</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Địa chỉ</th>
              <th className="text-left p-4 font-medium text-muted-foreground">SĐT</th>
              <th className="text-right p-4 font-medium text-muted-foreground">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <React.Fragment key={s.maNhaCungCap}>
                <tr className={`border-b hover:bg-muted/20 transition-colors cursor-pointer ${expandedId === s.maNhaCungCap ? 'bg-muted/10' : ''}`} onClick={() => setExpandedId(expandedId === s.maNhaCungCap ? null : s.maNhaCungCap)}>
                  <td className="p-4 text-center">
                    {expandedId === s.maNhaCungCap ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{s.maNhaCungCap}</td>
                  <td className="p-4 font-semibold text-foreground">{s.tenNhaCungCap}</td>
                  <td className="p-4 text-muted-foreground max-w-xs truncate">{s.diaChi}</td>
                  <td className="p-4">{s.soDienThoai}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setViewing(s); setViewOpen(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
                {expandedId === s.maNhaCungCap && (
                  <tr>
                    <td colSpan={6} className="bg-muted/10 p-6">
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <h3 className="font-bold text-base flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" /> Danh sách sản phẩm của {s.tenNhaCungCap}
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {equipment.filter(e => e.maNhaCungCap === s.maNhaCungCap).length > 0 ? (
                            equipment.filter(e => e.maNhaCungCap === s.maNhaCungCap).map(e => (
                              <div key={e.maThietBi} className="bg-background rounded-lg border border-border/50 p-3 flex gap-3 group relative hover:shadow-md transition-shadow">
                                <div className="w-16 h-16 rounded border bg-muted flex-shrink-0 overflow-hidden">
                                  {e.hinhAnh ? <img src={e.hinhAnh} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-muted-foreground/30 m-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate">{e.tenThietBi}</div>
                                  <div className="text-xs text-muted-foreground">{LOAI_THIET_BI_LABELS[e.loaiThietBi || 'TAI_SU_DUNG']} • {e.donViTinh}</div>
                                  <div className="text-xs text-muted-foreground mt-1 font-mono">{e.maThietBi}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full py-8 text-center text-muted-foreground italic">
                              Chưa có thiết bị nào từ nhà cung cấp này.
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Không tìm thấy nhà cung cấp phù hợp</div>}

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chi tiết Nhà cung cấp</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm py-2">
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Mã định danh:</span> <strong>{viewing.maNhaCungCap}</strong></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Chi tiết tên:</span> <strong>{viewing.tenNhaCungCap}</strong></div>
              <div className="space-y-1"><span className="text-muted-foreground">Địa chỉ:</span> <p className="font-medium">{viewing.diaChi || '—'}</p></div>
              <div className="flex justify-between border-b pb-2 pt-2"><span className="text-muted-foreground">SĐT liên hệ:</span> <strong>{viewing.soDienThoai || '—'}</strong></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Email:</span> <strong>{viewing.email || '—'}</strong></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
