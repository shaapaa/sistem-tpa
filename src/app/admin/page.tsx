"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/page-header"
import { MetricRail } from "@/components/layout/metric-rail"
import { SectionHeader } from "@/components/layout/section-header"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

interface Stats { santri: number; pengajar: number; kelas: number; jadwal: number; hadir: number; izin: number; sakit: number; alpha: number }
const COLORS = ["#376b59", "#b58b4b", "#b85b4b", "#768078"]

function renderAttendanceLabel({ name, value, x, y, textAnchor, viewBox }: {
  name?: string
  value?: number
  x?: number
  y?: number
  textAnchor?: "start" | "middle" | "end" | "inherit"
  viewBox?: { width?: number }
}) {
  const fontSize = Math.max(9, Math.min(12, (viewBox?.width ?? 320) / 30))
  return <text x={x} y={y} textAnchor={textAnchor} fill="#26352e" fontSize={fontSize} fontWeight={600}>{name} {value}</text>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ santri: 0, pengajar: 0, kelas: 0, jadwal: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0 })
  const [attendanceData, setAttendanceData] = useState<{ name: string; value: number }[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const [santri, pengajar, kelas, jadwal, absensi] = await Promise.all([
        supabase.from("santris").select("id", { count: "exact", head: true }),
        supabase.from("pengajars").select("id", { count: "exact", head: true }),
        supabase.from("groups").select("id", { count: "exact", head: true }),
        supabase.from("jadwals").select("id", { count: "exact", head: true }),
        supabase.from("absensis").select("status"),
      ])
      const rows = absensi.data ?? []
      const next = {
        santri: santri.count ?? 0, pengajar: pengajar.count ?? 0, kelas: kelas.count ?? 0, jadwal: jadwal.count ?? 0,
        hadir: rows.filter((a) => a.status === "HADIR").length,
        izin: rows.filter((a) => a.status === "IZIN").length,
        sakit: rows.filter((a) => a.status === "SAKIT").length,
        alpha: rows.filter((a) => a.status === "ALPHA").length,
      }
      setStats(next)
      setAttendanceData([{ name: "Hadir", value: next.hadir }, { name: "Izin", value: next.izin }, { name: "Sakit", value: next.sakit }, { name: "Alpha", value: next.alpha }])
    }
    fetchStats()
  }, [])

  const totalAttendance = stats.hadir + stats.izin + stats.sakit + stats.alpha
  const rate = totalAttendance ? Math.round((stats.hadir / totalAttendance) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operasional TPA" title="Ringkasan hari ini" description="Data utama Baitul Yatama dalam satu pandangan." />
      <MetricRail items={[
        { label: "Santri", value: stats.santri, detail: "santri aktif", href: "/admin/santri", tone: "primary" },
        { label: "Pengajar", value: stats.pengajar, detail: "pengajar terdaftar", href: "/admin/pengajar" },
        { label: "Kelas", value: stats.kelas, detail: "kelas berjalan", href: "/admin/kelas" },
        { label: "Jadwal", value: stats.jadwal, detail: "jadwal terisi", href: "/admin/jadwal" },
      ]} />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface-panel min-w-0 overflow-hidden p-5 sm:p-6">
          <SectionHeader title="Distribusi kehadiran" description="Seluruh catatan presensi tersimpan" />
          {totalAttendance ? <>
            <div className="mt-4 h-[240px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart margin={{ top: 8, right: 42, bottom: 8, left: 42 }}>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius="38%"
                    outerRadius="58%"
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    label={renderAttendanceLabel}
                    labelLine={{ stroke: "#768078", strokeWidth: 1 }}
                  >
                    {attendanceData.map((entry, index) => <Cell key={entry.name} style={{ fill: COLORS[index] }} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              {attendanceData.map((item, index) => <div key={item.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />{item.name}</div>)}
            </div>
          </> : <div className="flex h-[280px] flex-col items-center justify-center text-center text-sm text-muted-foreground"><p>Belum ada catatan kehadiran</p><p className="mt-1 text-xs">Data akan muncul setelah presensi pertama dicatat.</p></div>}
        </section>
        <section className="surface-panel min-w-0 p-5 sm:p-6">
          <SectionHeader title="Catatan cepat" description="Indikator yang perlu dipantau" />
          <div className="mt-6 space-y-5">
            <div className="flex items-end justify-between"><span className="text-sm text-muted-foreground">Tingkat kehadiran</span><strong className="font-mono text-3xl tracking-[-0.06em] text-primary">{rate}%</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${rate}%` }} /></div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/60 pt-5">
              <div><p className="eyebrow">Hadir</p><p className="mt-1 font-mono text-xl text-primary">{stats.hadir}</p></div>
              <div><p className="eyebrow">Izin / sakit</p><p className="mt-1 font-mono text-xl text-amber-700">{stats.izin + stats.sakit}</p></div>
              <div><p className="eyebrow">Alpha</p><p className="mt-1 font-mono text-xl text-destructive">{stats.alpha}</p></div>
              <div><p className="eyebrow">Total santri</p><p className="mt-1 font-mono text-xl">{stats.santri}</p></div>
            </div>
          </div>
        </section>
      </div>
      <section>
        <SectionHeader title="Catatan operasional" description="Pilih angka di atas untuk membuka data lengkap." />
        <Card className="mt-4 surface-panel"><CardContent className="p-5 text-sm leading-6 text-muted-foreground">Pantau pengisian presensi dan perkembangan secara berkala agar laporan setiap santri tetap lengkap.</CardContent></Card>
      </section>
    </div>
  )
}
