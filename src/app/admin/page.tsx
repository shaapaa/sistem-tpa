"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, BookOpen, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface Stats {
  santri: number
  pengajar: number
  kelas: number
  jadwal: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
}

const COLORS = ["#14b8a6", "#f59e0b", "#ef4444", "#6b7280"]

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ santri: 0, pengajar: 0, kelas: 0, jadwal: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0 })
  const [attendanceData, setAttendanceData] = useState<any[]>([])
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

      const absenData = absensi.data ?? []
      const hadir = absenData.filter(a => a.status === "HADIR").length
      const izin = absenData.filter(a => a.status === "IZIN").length
      const sakit = absenData.filter(a => a.status === "SAKIT").length
      const alpha = absenData.filter(a => a.status === "ALPHA").length

      setStats({
        santri: santri.count ?? 0,
        pengajar: pengajar.count ?? 0,
        kelas: kelas.count ?? 0,
        jadwal: jadwal.count ?? 0,
        hadir, izin, sakit, alpha,
      })

      setAttendanceData([
        { name: "Hadir", value: hadir },
        { name: "Izin", value: izin },
        { name: "Sakit", value: sakit },
        { name: "Alpha", value: alpha },
      ])
    }

    fetchStats()
  }, [])

  const cards = [
    { title: "Total Santri", value: stats.santri, icon: Users, description: "Santri aktif", href: "/admin/santri" },
    { title: "Total Pengajar", value: stats.pengajar, icon: GraduationCap, description: "Pengajar terdaftar", href: "/admin/pengajar" },
    { title: "Total Kelas", value: stats.kelas, icon: BookOpen, description: "Kelas berjalan", href: "/admin/kelas" },
    { title: "Total Jadwal", value: stats.jadwal, icon: Calendar, description: "Jadwal mingguan", href: "/admin/jadwal" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ringkasan data TPA Baitul Yatama</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href}>
              <Card className="card-elevated card-elevated-hover cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                    <p className="text-xs text-muted-foreground/70">{card.description}</p>
                  </div>
                  <div className="rounded-lg p-2 bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold tracking-tight font-tabular">{card.value}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribusi Kehadiran</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.hadir + stats.izin + stats.sakit + stats.alpha > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                Belum ada data kehadiran
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Statistik Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tingkat Kehadiran</span>
                <span className="font-bold font-tabular text-primary">
                  {stats.hadir + stats.izin + stats.sakit + stats.alpha > 0
                    ? Math.round((stats.hadir / (stats.hadir + stats.izin + stats.sakit + stats.alpha)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${stats.hadir + stats.izin + stats.sakit + stats.alpha > 0
                      ? (stats.hadir / (stats.hadir + stats.izin + stats.sakit + stats.alpha)) * 100
                      : 0}%`
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold font-tabular text-green-600">{stats.hadir}</div>
                  <p className="text-xs text-muted-foreground">Hadir</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-tabular text-amber-600">{stats.izin + stats.sakit}</div>
                  <p className="text-xs text-muted-foreground">Izin/Sakit</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-tabular text-red-600">{stats.alpha}</div>
                  <p className="text-xs text-muted-foreground">Alpha</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-tabular">{stats.santri}</div>
                  <p className="text-xs text-muted-foreground">Total Santri</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
