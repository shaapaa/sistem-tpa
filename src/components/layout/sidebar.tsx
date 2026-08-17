"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { LogOut, LayoutDashboard } from "lucide-react"
import { iconMap, navItemsForRole, isNavItemActive, type NavItem } from "@/lib/nav"
import { useMemo } from "react"

function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = isNavItemActive(pathname, item.href)
        const Icon = iconMap[item.iconName] || LayoutDashboard

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                 ? "bg-[oklch(0.34_0.055_155)] text-[oklch(0.98_0.008_92)]"
                : "text-[oklch(0.78_0.025_92)] hover:bg-sidebar-accent hover:text-[oklch(0.98_0.008_92)]"
            )}
          >
             <Icon className="h-4.5 w-4.5 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <img src="/logo-mark.svg" alt="Logo TPA Baitul Yatama" className="h-10 w-10 rounded-md" />
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-[oklch(0.98_0.008_92)] truncate">Baitul Yatama</span>
        <span className="text-xs text-[oklch(0.72_0.025_92)] truncate">Monitoring System</span>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const navItems = useMemo(() => navItemsForRole(profile?.role), [profile?.role])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <Logo />
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="space-y-2 px-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md bg-sidebar-accent animate-pulse" />
            ))}
          </div>
        ) : (
          <NavLinks items={navItems} />
        )}
      </div>
      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="px-3">
          <div className="text-sm font-medium text-sidebar-foreground truncate">{profile?.username}</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[oklch(0.72_0.025_92)]">{profile?.role?.toLowerCase()}</div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-[oklch(0.72_0.025_92)] hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-200"
        >
          <LogOut className="h-4.5 w-4.5" />
          Keluar
        </button>
      </div>
    </aside>
  )
}
