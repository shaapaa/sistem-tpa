export const roles = ["ADMIN", "PENGAJAR", "ORANG_TUA"] as const;
export type Role = (typeof roles)[number];

export interface NavItem {
  label: string;
  href: string;
  iconName: string;
}

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", iconName: "LayoutDashboard" },
  { label: "Santri", href: "/admin/santri", iconName: "Users" },
  { label: "Pengajar", href: "/admin/pengajar", iconName: "GraduationCap" },
  { label: "Kelas", href: "/admin/kelas", iconName: "BookOpen" },
  { label: "Jadwal", href: "/admin/jadwal", iconName: "Calendar" },
  { label: "Users", href: "/admin/users", iconName: "UserCog" },
];

export const pengajarNav: NavItem[] = [
  { label: "Dashboard", href: "/pengajar", iconName: "LayoutDashboard" },
  { label: "Jadwal", href: "/pengajar/jadwal", iconName: "Calendar" },
  { label: "Perkembangan", href: "/pengajar/perkembangan", iconName: "TrendingUp" },
  { label: "Rekap Perkembangan", href: "/pengajar/rekap-perkembangan", iconName: "ListChecks" },
  { label: "Presensi", href: "/pengajar/presensi", iconName: "ClipboardCheck" },
  { label: "Laporan", href: "/pengajar/laporan", iconName: "FileText" },
];

export const orangTuaNav: NavItem[] = [
  { label: "Dashboard", href: "/orang-tua", iconName: "LayoutDashboard" },
  { label: "Anak", href: "/orang-tua/anak", iconName: "Baby" },
  { label: "Laporan", href: "/orang-tua/laporan", iconName: "FileText" },
];
