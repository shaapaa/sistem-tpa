"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { adminNav, pengajarNav, orangTuaNav } from "@/lib/constants"
import { LogOut, LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, ClipboardCheck, Baby, BarChart3, FileText, UserCog } from "lucide-react"
import type { NavItem } from "@/lib/constants"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
}

function TabLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = iconMap[item.iconName] || LayoutDashboard

  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
      {item.label}
    </Link>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, loading } = useAuth()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const navItems = profile?.role === "ADMIN"
    ? adminNav
    : profile?.role === "PENGAJAR"
    ? pengajarNav
    : orangTuaNav

  if (loading) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-border bg-card lg:hidden safe-area-bottom">
      {navItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== "/admin" && item.href !== "/pengajar" && item.href !== "/orang-tua" && pathname.startsWith(item.href))
        return <TabLink key={item.href} item={item} isActive={isActive} />
      })}
      <button
        onClick={handleLogout}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors duration-200 hover:text-destructive"
      >
        <LogOut className="h-5 w-5" />
        Keluar
      </button>
    </nav>
  )
}