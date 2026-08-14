"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { LogOut, LayoutDashboard } from "lucide-react"
import { iconMap, navItemsForRole, isNavItemActive, type NavItem } from "@/lib/nav"

function TabLink({ item, isActive }: { item: NavItem; isActive: boolean }) { const Icon = iconMap[item.iconName] || LayoutDashboard; return <a href={item.href} aria-current={isActive ? "page" : undefined} className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground")}><span className={cn("flex size-8 items-center justify-center rounded-xl", isActive && "bg-primary/10") }><Icon /></span><span className="max-w-full truncate px-1">{item.label}</span></a> }

export function MobileNav() { const pathname = usePathname(); const router = useRouter(); const { profile, loading } = useAuth(); const supabase = createClient(); const navItems = useMemo(() => navItemsForRole(profile?.role), [profile?.role]); const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }; if (loading) return null; return <nav aria-label="Navigasi mobile" className="bottom-nav-shadow fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-border/70 bg-card/95 backdrop-blur lg:hidden safe-area-bottom">{navItems.map((item) => <TabLink key={item.href} item={item} isActive={isNavItemActive(pathname, item.href)} />)}<button onClick={handleLogout} className="flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-destructive"><span className="flex size-8 items-center justify-center rounded-xl"><LogOut /></span><span>Keluar</span></button></nav> }
