"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { adminNav, pengajarNav, orangTuaNav } from "@/lib/constants"
import { LogOut, LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, ClipboardCheck, Baby, BarChart3, FileText } from "lucide-react"
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
}

function NavLinks({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== "/admin" && item.href !== "/pengajar" && item.href !== "/orang-tua" && pathname.startsWith(item.href))
        const Icon = iconMap[item.iconName] || LayoutDashboard

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive && "text-primary")} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
        TPA
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-foreground truncate">Baitul Yatama</span>
        <span className="text-xs text-muted-foreground truncate">Monitoring System</span>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { profile, loading } = useAuth()
  const router = useRouter()
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

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-border lg:bg-card">
      <Logo />
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="space-y-2 px-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <NavLinks items={navItems} />
        )}
      </div>
      <div className="border-t border-border p-3 space-y-2">
        <div className="px-3">
          <div className="text-sm font-medium text-foreground truncate">{profile?.username}</div>
          <div className="text-xs text-muted-foreground capitalize">{profile?.role?.toLowerCase()}</div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
        >
          <LogOut className="h-4.5 w-4.5" />
          Keluar
        </button>
      </div>
    </aside>
  )
}