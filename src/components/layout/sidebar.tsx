"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { LogOut, LayoutDashboard, Sparkles } from "lucide-react"
import { iconMap, navItemsForRole, isNavItemActive, type NavItem } from "@/lib/nav"
import { useMemo } from "react"

function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return <nav aria-label="Navigasi utama" className="flex flex-col gap-1">{items.map((item) => { const isActive = isNavItemActive(pathname, item.href); const Icon = iconMap[item.iconName] || LayoutDashboard; return <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200", isActive ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground")}><span className={cn("flex size-8 items-center justify-center rounded-lg", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-foreground/5 text-sidebar-foreground/65 group-hover:text-sidebar-foreground")}><Icon /></span><span>{item.label}</span>{isActive && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />}</Link> })}</nav>
}

function Logo() { return <div className="border-b border-sidebar-border px-5 py-6"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground shadow-lg"><Sparkles /></div><div className="min-w-0"><p className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">Baitul Yatama</p><p className="truncate text-[11px] text-sidebar-foreground/55">Ruang tumbuh bersama</p></div></div><p className="mt-5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">TPA Monitoring</p></div> }

export function Sidebar() {
  const { profile, loading } = useAuth(); const router = useRouter(); const supabase = createClient(); const navItems = useMemo(() => navItemsForRole(profile?.role), [profile?.role])
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
  return <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar lg:flex"><Logo /><div className="flex-1 overflow-y-auto px-3 py-6">{loading ? <div className="flex flex-col gap-2 px-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-sidebar-foreground/10" />)}</div> : <NavLinks items={navItems} />}</div><div className="border-t border-sidebar-border p-4"><div className="mb-3 rounded-xl bg-sidebar-foreground/5 px-3 py-3"><p className="truncate text-sm font-semibold text-sidebar-foreground">{profile?.username ?? "Pengguna"}</p><p className="mt-0.5 text-xs capitalize text-sidebar-foreground/55">{profile?.role?.toLowerCase() ?? "akun"}</p></div><button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-destructive/15 hover:text-sidebar-foreground"><LogOut /> Keluar</button></div></aside>
}
