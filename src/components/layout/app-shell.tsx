"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { AppNavContext } from "@/components/layout/app-nav-context"

const publicPaths = ["/login", "/register"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <AppNavContext.Provider value={{ openMenu: () => setMenuOpen(true) }}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="min-h-screen overflow-y-auto pb-6 lg:ml-60 lg:pb-0">
          <div className="container-page py-4 sm:py-8 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </AppNavContext.Provider>
  )
}
