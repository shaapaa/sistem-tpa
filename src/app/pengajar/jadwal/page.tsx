"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"
import { formatHari, formatTime, urutkanJadwalMenurutHari } from "@/lib/format"
import { PageHeader } from "@/components/layout/page-header"

type Jadwal = { id: string; hari: string; jam_mulai: string; jam_selesai: string; sesi?: { nama: string } | null }

export default function PengajarJadwalPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [jadwals, setJadwals] = useState<Jadwal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
      if (!pengajar) { setLoading(false); return }
      const { data } = await supabase.from("jadwal_sesi").select("id, hari, jam_mulai, jam_selesai, sesi(nama), jadwal_sesi_pengajar!inner(pengajar_id)").eq("jadwal_sesi_pengajar.pengajar_id", pengajar.id).order("hari").order("jam_mulai")
      setJadwals((data ?? []) as unknown as Jadwal[])
      setLoading(false)
    }
    void load()
  }, [user])

  const sorted = urutkanJadwalMenurutHari(jadwals)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Ritme mengajar" title="Jadwal Anda" description="Satu jadwal sesi untuk seluruh santri Iqra dan Al-Qur'an yang Anda ajar." />
      {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-muted" />)}</div> : sorted.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12"><Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Belum ada jadwal</p></div> : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((item) => {
            const sesi = item.sesi?.nama === "PAGI" ? "Pagi" : item.sesi?.nama === "SORE" ? "Sore" : "-"
            return <Card key={item.id} className="border border-primary/20 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="border-t-4 border-primary p-4">
                <div className="flex items-start justify-between gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Calendar className="h-4 w-4" /></div><Badge className="border-0 bg-primary/10 text-xs text-primary hover:bg-primary/10">{formatHari(item.hari)}</Badge></div>
                <p className="mt-4 font-semibold text-foreground">Sesi {sesi}</p>
                <p className="mt-1 text-sm text-muted-foreground">Iqra &amp; Al-Qur&apos;an</p>
                <p className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</p>
              </div>
            </Card>
          })}
        </section>
      )}
    </div>
  )
}
