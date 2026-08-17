"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { LogOut, LayoutDashboard } from "lucide-react"
import { iconMap, navItemsForRole, isNavItemActive, type NavItem } from "@/lib/nav"
import { useMemo } from "react"

function TabLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = iconMap[item.iconName] || LayoutDashboard

  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200",
        isActive ? "bg-[oklch(0.34_0.055_155)] text-[oklch(0.98_0.008_92)]" : "text-[oklch(0.78_0.025_92)]"
      )}
    >
      <Icon className={cn("h-5 w-5", isActive && "text-[oklch(0.82_0.08_92)]")} />
      {item.label}
    </Link>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, loading } = useAuth()
  const supabase = createClient()
  const navItems = useMemo(() => navItemsForRole(profile?.role), [profile?.role])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-sidebar-border bg-sidebar text-sidebar-foreground lg:hidden safe-area-bottom">
      {navItems.map((item) => (
        <TabLink key={item.href} item={item} isActive={isNavItemActive(pathname, item.href)} />
      ))}
      <button
        onClick={handleLogout}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-[oklch(0.72_0.025_92)] transition-colors duration-200 hover:text-sidebar-foreground"
      >
        <LogOut className="h-5 w-5" />
        Keluar
      </button>
    </nav>
  )
}
