"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"
import { formatHari, formatTime } from "@/lib/format"
import { PageHeader } from "@/components/layout/page-header"

type Jadwal = { id: string; hari: string; jam_mulai: string; jam_selesai: string; sesi?: { nama: string } | null }
const HARI = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"]

export default function PengajarJadwalPage() {
  const { user } = useAuth(); const supabase = createClient(); const [jadwals, setJadwals] = useState<Jadwal[]>([]); const [loading, setLoading] = useState(true)
  useEffect(() => { const load = async () => { if (!user) return; const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single(); if (!pengajar) { setLoading(false); return }; const { data } = await supabase.from("jadwal_sesi").select("id, hari, jam_mulai, jam_selesai, sesi(nama)").order("hari").order("jam_mulai"); setJadwals((data ?? []) as unknown as Jadwal[]); setLoading(false) }; void load() }, [user])
  const sorted = [...jadwals].sort((a, b) => HARI.indexOf(a.hari) - HARI.indexOf(b.hari))
  return <div className="space-y-6"><PageHeader eyebrow="Ritme mengajar" title="Jadwal Anda" description="Satu jadwal sesi untuk seluruh santri Iqra dan Al-Qur'an yang Anda ajar." />
    {loading ? <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div> : sorted.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12"><Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Belum ada jadwal</p></div> : <Card className="surface-panel overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/30"><th className="px-4 py-3 text-left font-medium text-muted-foreground">Hari</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Sesi</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Jam</th></tr></thead><tbody>{sorted.map((item) => { const sesi = item.sesi?.nama === "PAGI" ? "Pagi" : item.sesi?.nama === "SORE" ? "Sore" : "-"; return <tr key={item.id} className="border-b border-border/50 last:border-0"><td className="px-4 py-3"><Badge variant="outline" className="text-xs">{formatHari(item.hari)}</Badge></td><td className="px-4 py-3 font-medium">Sesi {sesi} · Iqra & Al-Qur&apos;an</td><td className="px-4 py-3 text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</span></td></tr> })}</tbody></table></div></Card>}
  </div>
}
