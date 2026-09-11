"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { LogOut, LayoutDashboard, Quote } from "lucide-react"
import { iconMap, navItemsForRole, isNavItemActive, type NavItem } from "@/lib/nav"
import { useEffect, useMemo, useState } from "react"
import { formatIslamicDate, HADITH_QUOTES } from "@/lib/islamic-date"

const ARABESQUE = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='none' stroke='%23ffffff' stroke-opacity='0.12'><circle cx='40' cy='40' r='18'/><circle cx='40' cy='40' r='28'/><path d='M40 12v8M40 60v8M12 40h8M60 40h8M24 24l6 6M50 50l6 6M56 24l-6 6M30 50l-6 6'/></g></svg>`
)

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
  const [date] = useState(() => formatIslamicDate())
  return (
    <div className="relative overflow-hidden border-b border-amber-400/30 bg-gradient-to-br from-primary via-teal-700 to-emerald-900 px-5 py-6">
      <div className="absolute inset-0" style={{ backgroundImage: `url("${ARABESQUE}")`, backgroundSize: "90px 90px" }} />
      <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/15" />
      <div className="relative flex items-center gap-2.5">
        <img src="/image/logo-tpa-transparent.png" alt="Logo TPA Baitul Yatama" className="h-10 w-auto object-contain" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate">Baitul Yatama</span>
          <span className="text-xs text-white/75 truncate">Sistem Monitoring Santri</span>
        </div>
      </div>
      <p className="relative mt-3 border-t border-white/15 pt-2.5 text-[10px] leading-4 text-white/70">{date.masehiShort} · {date.hijri}</p>
    </div>
  )
}

export function SidebarContent() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const navItems = useMemo(() => navItemsForRole(profile?.role), [profile?.role])
  const [quoteIdx, setQuoteIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx((i) => (i + 1) % HADITH_QUOTES.length), 6000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <>
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
        <div className="rounded-lg bg-sidebar-accent/60 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" />
            <p className="text-[10.5px] leading-[1.45] text-[oklch(0.8_0.03_92)]">{HADITH_QUOTES[quoteIdx].t}</p>
          </div>
          <p className="mt-1.5 text-right text-[10px] text-amber-400/70">— {HADITH_QUOTES[quoteIdx].s}</p>
        </div>
        <div className="px-3">
          <div className="text-sm font-medium text-sidebar-foreground truncate">{profile?.nama}</div>
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
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <SidebarContent />
    </aside>
  )
}
