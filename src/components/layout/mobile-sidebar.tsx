"use client"

import { X } from "lucide-react"
import { SidebarContent } from "@/components/layout/sidebar"
import { cn } from "@/lib/utils"

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        className={cn("fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
        aria-hidden
      />
      <div
        className={cn("fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-300 lg:hidden", open ? "translate-x-0" : "-translate-x-full")}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Tutup menu"
        >
          <X className="h-4.5 w-4.5" />
        </button>
        <SidebarContent />
      </div>
    </>
  )
}