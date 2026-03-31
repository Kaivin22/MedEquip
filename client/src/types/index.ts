export type UserRole = 'ADMIN' | 'NV_KHO' | 'TRUONG_KHOA' | 'NV_BV';

export interface NguoiDung {
  maNguoiDung: string;
  hoTen: string;
  email: string;
  matKhau: string;
  vaiTro: UserRole;
  trangThai: boolean;
  ngayTao: string;
  ngayCapNhat: string;
  soDienThoai?: string;
  diaChi?: string;
}

export interface ThietBi {
  maThietBi: string;
  tenThietBi: string;
  loaiThietBi: string;
  donViTinh: string;
  moTa: string;
  maNhaCungCap: string;
  trangThai: boolean;
  ngayTao: string;
  hinhAnh?: string;
}

export interface TonKho {
  maTonKho: string;
  maThietBi: string;
  soLuongKho: number;
  soLuongHu: number;
  soLuongDangDung: number;
  ngayCapNhat: string;
}

export interface NhaCungCap {
  maNhaCungCap: string;
  tenNhaCungCap: string;
  diaChi: string;
  soDienThoai: string;
  email: string;
  trangThai: boolean;
}

export interface Khoa {
  maKhoa: string;
  tenKhoa: string;
  moTa: string;
  trangThai: boolean;
}

export interface PhieuYeuCauNhap {
  maPhieu: string;
  maNguoiYeuCau: string;
  tenThietBi: string;
  loaiThietBi: string;
  donViTinh: string;
  soLuong: number;
  mucDichSuDung: string;
  trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'DA_NHAP';
  ngayTao: string;
  ngayDuyet?: string;
  nguoiDuyet?: string;
  lyDoTuChoi?: string;
}

export interface PhieuYeuCauCapPhat {
  maPhieu: string;
  maNguoiYeuCau: string;
  maThietBi: string;
  maKhoa: string;
  soLuongYeuCau: number;
  lyDo: string;
  trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'DA_CAP_PHAT' | 'DA_NHAN';
  ngayTao: string;
  ngayDuyet?: string;
  lyDoTuChoi?: string;
}

export interface PhieuCapPhat {
  maPhieu: string;
  maPhieuYeuCau: string;
  maNhanVienKho: string;
  maThietBi: string;
  maNguoiMuon: string;
  maKhoa: string;
  soLuongCapPhat: number;
  ngayCapPhat: string;
  ghiChu: string;
}

export interface PhieuXuatKho {
  maPhieu: string;
  maNhanVienKho: string;
  maThietBi: string;
  soLuong: number;
  trangThai: 'DA_LAP' | 'DA_XUAT' | 'DA_HUY';
  ngayXuat: string;
  ghiChu: string;
  lyDoXuat: string;
}

export interface PhieuNhapKho {
  maPhieu: string;
  maNhaCungCap: string;
  maThietBi: string;
  soLuongNhap: number;
  ngayNhap: string;
  maNhanVienKho: string;
  ghiChu: string;
}

export interface PhieuBaoHuHong {
  maPhieu: string;
  maNguoiBao: string;
  maThietBi: string;
  maKhoa: string;
  soLuongHu: number;
  moTaHuHong: string;
  trangThai: 'CHO_XU_LY' | 'DA_XU_LY';
  ngayBao: string;
  ngayXuLy?: string;
  ghiChu?: string;
}

export interface ThongBao {
  id: string;
  tieuDe: string;
  noiDung: string;
  loai: 'info' | 'success' | 'warning' | 'error';
  nguoiNhan: string;
  daDoc: boolean;
  ngayTao: string;
}

export interface NhatKy {
  maNhatKy: string;
  maNguoiDung: string;
  hanhDong: string;
  thoiGian: string;
  chiTiet: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  NV_KHO: 'Nhân viên Kho',
  TRUONG_KHOA: 'Trưởng Khoa',
  NV_BV: 'Nhân viên Bệnh viện',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-destructive/10 text-destructive',
  NV_KHO: 'bg-primary/10 text-primary',
  TRUONG_KHOA: 'bg-warning/10 text-warning',
  NV_BV: 'bg-accent/10 text-accent',
};
