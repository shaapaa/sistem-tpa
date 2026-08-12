"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, BookOpen, Calendar } from "lucide-react"

interface Stats {
  santri: number
  pengajar: number
  kelas: number
  jadwal: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ santri: 0, pengajar: 0, kelas: 0, jadwal: 0 })
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const [santri, pengajar, kelas, jadwal] = await Promise.all([
        supabase.from("santris").select("id", { count: "exact", head: true }),
        supabase.from("pengajars").select("id", { count: "exact", head: true }),
        supabase.from("groups").select("id", { count: "exact", head: true }),
        supabase.from("jadwals").select("id", { count: "exact", head: true }),
      ])

      setStats({
        santri: santri.count ?? 0,
        pengajar: pengajar.count ?? 0,
        kelas: kelas.count ?? 0,
        jadwal: jadwal.count ?? 0,
      })
    }

    fetchStats()
  }, [])

  const cards = [
    { title: "Total Santri", value: stats.santri, icon: Users, description: "Santri aktif" },
    { title: "Total Pengajar", value: stats.pengajar, icon: GraduationCap, description: "Pengajar terdaftar" },
    { title: "Total Kelas", value: stats.kelas, icon: BookOpen, description: "Kelas berjalan" },
    { title: "Total Jadwal", value: stats.jadwal, icon: Calendar, description: "Jadwal mingguan" },
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
            <Card key={card.title} className="card-elevated card-elevated-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <p className="text-xs text-muted-foreground/70">{card.description}</p>
                </div>
                <div className="rounded-lg p-2 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight font-tabular">{card.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}