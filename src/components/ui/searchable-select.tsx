"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  options: Option[]
  disabled?: boolean
}

export function SearchableSelect({ value, onChange, placeholder = "Pilih", options, disabled }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const filtered = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())), [options, query])
  const selected = options.find((o) => o.value === value)

  const toggle = () => {
    if (disabled) return
    if (open) { setOpen(false); return }
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left, width: r.width })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    const initialWidth = window.innerWidth
    const onResize = () => {
      // Only close the menu on width changes (likely orientation change),
      // not on height-only resizes such as mobile virtual keyboard opening.
      if (window.innerWidth !== initialWidth) setOpen(false)
    }

    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", onResize)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", onResize)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className="flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.label ?? placeholder}</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && pos && createPortal(
        <div className="fixed inset-0 z-[70]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="absolute" style={{ top: pos.top, left: Math.min(pos.left, window.innerWidth - pos.width - 8) }} onClick={(e) => e.stopPropagation()} ref={menuRef}>
            <div className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg" style={{ minWidth: pos.width }}>
              <div className="border-b border-border/60 p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari..." className="h-9 pl-8" />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto p-1">
                {filtered.length === 0 ? (
                  <p className="px-2.5 py-2 text-sm text-muted-foreground">Tidak ditemukan</p>
                ) : (
                  filtered.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { onChange(o.value); setOpen(false); setQuery("") }}
                      className={cn("flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted", value === o.value && "bg-primary/10 font-medium")}
                    >
                      {o.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}