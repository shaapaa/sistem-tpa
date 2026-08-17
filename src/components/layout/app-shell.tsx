"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"

const publicPaths = ["/login"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-h-screen overflow-y-auto pb-20 lg:ml-60 lg:pb-0">
        <div className="container-page py-5 sm:py-8 lg:py-10">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
