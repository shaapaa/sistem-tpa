import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Baby,
  BarChart3,
  FileText,
  UserCog,
  TrendingUp,
  ListChecks,
} from "lucide-react"
import { adminNav, pengajarNav, orangTuaNav, type NavItem, type Role } from "@/lib/constants"

export type { NavItem }

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Baby,
  BarChart3,
  FileText,
  UserCog,
  TrendingUp,
  ListChecks,
}

export function navItemsForRole(role: Role | undefined): NavItem[] {
  if (role === "ADMIN") return adminNav
  if (role === "PENGAJAR") return pengajarNav
  return orangTuaNav
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href ||
    (href !== "/admin" && href !== "/pengajar" && href !== "/orang-tua" && pathname.startsWith(href))
}
