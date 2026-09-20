"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  fromYear?: number
  toYear?: number
}

const monthNames = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" })
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index,
  label: new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2026, index, 1)),
}))
const weekdays = ["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"]

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function DatePicker({ value, onChange, placeholder = "Pilih tanggal", disabled, fromYear, toYear }: DatePickerProps) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1))
  const years = useMemo(() => {
    if (fromYear === undefined) return []
    const lastYear = toYear ?? new Date().getFullYear()
    return Array.from({ length: Math.max(0, lastYear - fromYear + 1) }, (_, index) => lastYear - index)
  }, [fromYear, toYear])
  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array(firstDay).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  }, [month])
  const label = value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : placeholder

  const toggle = () => {
    if (disabled) return
    if (open) { setOpen(false); return }
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const w = Math.min(288, window.innerWidth - 16)
    let left = r.left
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8
    if (left < 8) left = 8
    setPos({ top: r.bottom + 6, left })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [open])

  return (
    <>
      <div ref={wrapRef} className="w-full">
        <Button type="button" variant="outline" disabled={disabled} onClick={toggle} className="h-9 w-full justify-between px-3 font-normal">
          <span className={cn(!value && "text-muted-foreground")}>{label}</span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      {open && pos && createPortal(
        <div className="fixed inset-0 z-[70]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="absolute" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
            <div className="w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg">
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                {years.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <select
                      aria-label="Pilih bulan"
                      value={month.getMonth()}
                      onChange={(event) => setMonth(new Date(month.getFullYear(), Number(event.target.value), 1))}
                      className="h-8 min-w-0 rounded-md border border-input bg-background px-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <select
                      aria-label="Pilih tahun"
                      value={month.getFullYear()}
                      onChange={(event) => setMonth(new Date(Number(event.target.value), month.getMonth(), 1))}
                      className="h-8 rounded-md border border-input bg-background px-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                ) : <p className="text-sm font-medium capitalize">{monthNames.format(month)}</p>}
                <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground">
                {weekdays.map((day) => <span key={day} className="py-1">{day}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (!day) return <span key={`empty-${index}`} />
                  const date = new Date(month.getFullYear(), month.getMonth(), day)
                  const dateValue = isoDate(date)
                  return <button key={dateValue} type="button" onClick={() => { onChange(dateValue); setOpen(false) }} className={cn("h-8 rounded-md text-sm hover:bg-muted", value === dateValue && "bg-primary text-primary-foreground hover:bg-primary")}>{day}</button>
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
