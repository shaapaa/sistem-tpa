"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

const monthNames = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" })
const weekdays = ["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"]

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function DatePicker({ value, onChange, placeholder = "Pilih tanggal", disabled }: DatePickerProps) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1))
  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array(firstDay).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  }, [month])
  const label = value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : placeholder

  return (
    <div className="relative">
      <Button type="button" variant="outline" disabled={disabled} onClick={() => setOpen(!open)} className="h-9 w-full justify-between px-3 font-normal">
        <span className={cn(!value && "text-muted-foreground")}>{label}</span>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </Button>
      {open && !disabled && (
        <div className="absolute left-0 top-11 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <p className="text-sm font-medium capitalize">{monthNames.format(month)}</p>
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
      )}
    </div>
  )
}
