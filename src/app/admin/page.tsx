"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { StatCard } from "@/components/layout/stat-card"
import { IslamicBanner } from "@/components/layout/islamic-banner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Users, BookOpen, AlertTriangle, Activity, CalendarCheck, CalendarX, GraduationCap, Sunrise, Sunset, TrendingUp, UserX } from "lucide-react"
import { formatHari, formatTime } from "@/lib/format"

const ATT_COLORS = ["#376b59", "#b58b4b", "#b85b4b", "#768078"]
const PERIODS = [
  { label: "Hari ini", value: "today" },
  { label: "Minggu ini", value: "week" },
  { label: "Bulan ini", value: "month" },
  { label: "Custom", value: "custom" },
]

type PresensiRow = { status: string; santri_id: string; tanggal: string | null; kelompok_id: string | null; kelompok?: { sesi?: { nama: string } | null } | null }
type JadwalRow = { hari: string; jam_mulai: string; jam_selesai: string; kelompok?: { nama: string; sesi?: { nama: string } | null; pengajar?: { nama: string } | null } | null }

export default function AdminDashboard() {
  const [santriCount, setSantriCount] = useState(0)
  const [pengajarCount, setPengajarCount] = useState(0)
  const [sesiPagi, setSesiPagi] = useState(0)
  const [sesiSore, setSesiSore] = useState(0)
  const [presensi, setPresensi] = useState<PresensiRow[]>([])
  const [jadwals, setJadwals] = useState<JadwalRow[]>([])
  const [attention, setAttention] = useState<{ nama: string; reason: string; sesi: string }[]>([])
  const [monthPerk, setMonthPerk] = useState(0)
  const [monthPresensi, setMonthPresensi] = useState(0)

  const [period, setPeriod] = useState("month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [sesiFilter, setSesiFilter] = useState("ALL")

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const monthStart = currentMonthStart()
      const [santriC, pengajarC, santriList, presensiRes, jadwalRes, bacaanRes, cicilanRes, doaRes, salatRes] = await Promise.all([
        supabase.from("santri").select("id", { count: "exact", head: true }),
        supabase.from("pengajar").select("id", { count: "exact", head: true }),
        supabase.from("santri").select("id, nama, kelompok(sesi(nama))"),
        supabase.from("presensi").select("status, santri_id, tanggal, kelompok_id, kelompok(sesi(nama))"),
        supabase.from("jadwal").select("hari, jam_mulai, jam_selesai, kelompok(nama, sesi(nama), pengajar(nama))"),
        supabase.from("perkembangan_bacaan").select("santri_id, status, tanggal").eq("status", "TIDAK_LANCAR"),
        supabase.from("hafalan_surat_cicilan").select("hafalan_santri_id, status, tanggal, hafalan_santri(santri_id)").eq("status", "TIDAK_LANCAR"),
        supabase.from("perkembangan_hafalan_doa").select("santri_id, status, tanggal").eq("status", "TIDAK_LANCAR"),
        supabase.from("praktik_salat").select("santri_id, status, tanggal").eq("status", "BUTUH_BIMBINGAN"),
      ])

      setSantriCount(santriC.count ?? 0)
      setPengajarCount(pengajarC.count ?? 0)
      type SantriRow = { id: string; nama: string; kelompok?: { sesi?: { nama: string } | null } | null }
      type BacaanRow = { santri_id: string; status: string | null; tanggal: string }
      type CicilanRow = { santri_id?: string; status: string | null; tanggal: string; hafalan_santri?: { santri_id: string } | null }
      type DoaRow = { santri_id: string; status: string | null; tanggal: string }
      type SalatRow = { santri_id: string; status: string | null; tanggal: string }
      const santris = (santriList.data ?? []) as unknown as SantriRow[]
      setSesiPagi(santris.filter((s) => s.kelompok?.sesi?.nama === "PAGI").length)
      setSesiSore(santris.filter((s) => s.kelompok?.sesi?.nama === "SORE").length)
      setPresensi((presensiRes.data ?? []) as unknown as PresensiRow[])
      setJadwals((jadwalRes.data ?? []) as unknown as JadwalRow[])

      // Month activity
      const bacaanRows = (bacaanRes.data ?? []) as unknown as BacaanRow[]
      const cicilanRows = (cicilanRes.data ?? []) as unknown as CicilanRow[]
      const doaRows = (doaRes.data ?? []) as unknown as DoaRow[]
      const salatRows = (salatRes.data ?? []) as unknown as SalatRow[]
      const perkCount =
        bacaanRows.filter((r) => r.tanggal >= monthStart).length +
        cicilanRows.filter((r) => r.tanggal >= monthStart).length +
        doaRows.filter((r) => r.tanggal >= monthStart).length +
        salatRows.filter((r) => r.tanggal >= monthStart).length
      setMonthPerk(perkCount)
      setMonthPresensi((presensiRes.data ?? [] as unknown as PresensiRow[]).filter((r) => r.tanggal && r.tanggal >= monthStart).length)

      // Attention: alpha >= 2 this month
      const alphaCount: Record<string, number> = {}
      ;((presensiRes.data ?? []) as unknown as PresensiRow[]).forEach((r) => {
        if (r.status === "ALPHA" && r.tanggal && r.tanggal >= monthStart && r.santri_id) {
          alphaCount[r.santri_id] = (alphaCount[r.santri_id] ?? 0) + 1
        }
      })
      const reasons: Record<string, string> = {}
      const addReason = (id: string, reason: string) => { if (!reasons[id]) reasons[id] = reason }
      bacaanRows.forEach((r) => addReason(r.santri_id, "Perkembangan bacaan dinilai Tidak Lancar"))
      cicilanRows.forEach((r) => { const sid = r.hafalan_santri?.santri_id; if (sid) addReason(sid, "Hafalan dinilai Tidak Lancar") })
      doaRows.forEach((r) => addReason(r.santri_id, "Hafalan doa dinilai Tidak Lancar"))
      salatRows.forEach((r) => addReason(r.santri_id, "Praktik salat membutuhkan bimbingan"))

      const attList: { nama: string; reason: string; sesi: string }[] = []
      santris.forEach((s) => {
        const reason = reasons[s.id] ?? (alphaCount[s.id] && alphaCount[s.id] >= 2 ? `${alphaCount[s.id]}x tidak hadir (alpha) bulan ini` : null)
        if (reason) {
          attList.push({ nama: s.nama, reason, sesi: s.kelompok?.sesi?.nama === "PAGI" ? "Pagi" : s.kelompok?.sesi?.nama === "SORE" ? "Sore" : "-" })
        }
      })
      setAttention(attList)
    }
    fetchData()
  }, [])

  const range = useMemo(() => {
    const now = new Date()
    let from = ""
    let to = ""
    if (period === "today") { from = iso(now); to = iso(now) }
    else if (period === "week") { const d = new Date(now); d.setDate(now.getDate() - ((now.getDay() + 6) % 7)); from = iso(d); to = iso(now) }
    else if (period === "month") { from = currentMonthStart(); to = iso(now) }
    else if (period === "custom") { from = customFrom; to = customTo }
    return { from, to }
  }, [period, customFrom, customTo])

  const att = useMemo(() => {
    const a = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
    presensi.forEach((row) => {
      const t = row.tanggal
      if (!t) return
      if (sesiFilter !== "ALL" && row.kelompok?.sesi?.nama !== sesiFilter) return
      if (range.from && t < range.from) return
      if (range.to && t > range.to) return
      if (row.status === "HADIR") a.hadir++
      else if (row.status === "IZIN") a.izin++
      else if (row.status === "SAKIT") a.sakit++
      else if (row.status === "ALPHA") a.alpha++
    })
    return a
  }, [presensi, range, sesiFilter])

  const totalAtt = att.hadir + att.izin + att.sakit + att.alpha
  const rate = totalAtt ? Math.round((att.hadir / totalAtt) * 100) : 0
  const attData = [
    { name: "Hadir", value: att.hadir },
    { name: "Izin", value: att.izin },
    { name: "Sakit", value: att.sakit },
    { name: "Alpha", value: att.alpha },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="TPA Baitul Yatama" title="Dashboard monitoring" description="Ringkasan operasional dan evaluasi seluruh TPA." />
      <IslamicBanner text="Sebaik-baik kalian adalah yang mempelajari Al-Qur&apos;an dan mengajarkannya." source="HR. Bukhari" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Santri Aktif" value={santriCount} detail="seluruh santri" icon={Users} className="bg-gradient-to-br from-emerald-500 to-teal-700" href="/admin/santri" />
        <StatCard label="Pengajar Aktif" value={pengajarCount} detail="pengajar terdaftar" icon={GraduationCap} className="bg-gradient-to-br from-indigo-500 to-violet-700" href="/admin/pengajar" />
        <StatCard label="Sesi Pagi" value={sesiPagi} detail="santri sesi pagi" icon={Sunrise} className="bg-gradient-to-br from-amber-400 to-orange-600" href="/admin/santri" />
        <StatCard label="Sesi Sore" value={sesiSore} detail="santri sesi sore" icon={Sunset} className="bg-gradient-to-br from-violet-500 to-purple-700" href="/admin/santri" />
      </div>

      <div className="surface-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Periode</Label>
            <Select value={period} onValueChange={(v) => v && setPeriod(v)} items={PERIODS}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {period === "custom" && (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Dari</Label>
                <DatePicker value={customFrom} onChange={setCustomFrom} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Sampai</Label>
                <DatePicker value={customTo} onChange={setCustomTo} />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Sesi</Label>
            <Select value={sesiFilter} onValueChange={(v) => v && setSesiFilter(v)} items={[{ label: "Semua", value: "ALL" }, { label: "Pagi", value: "PAGI" }, { label: "Sore", value: "SORE" }]}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem value="PAGI">Pagi</SelectItem>
                <SelectItem value="SORE">Sore</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <section>
        <SectionHeader title="Ringkasan kehadiran" description={`Periode: ${periodLabel(period)} · Sesi: ${sesiFilter === "ALL" ? "Semua" : sesiFilter === "PAGI" ? "Pagi" : "Sore"}`} />
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          <StatCard label="Hadir" value={att.hadir} icon={CalendarCheck} className="bg-gradient-to-br from-emerald-500 to-teal-700" />
          <StatCard label="Izin" value={att.izin} icon={CalendarX} className="bg-gradient-to-br from-amber-400 to-orange-600" />
          <StatCard label="Sakit" value={att.sakit} icon={Activity} className="bg-gradient-to-br from-orange-400 to-red-500" />
          <StatCard label="Alpha" value={att.alpha} icon={UserX} className="bg-gradient-to-br from-rose-500 to-red-600" />
          <StatCard label="Persentase" value={`${rate}%`} icon={TrendingUp} className="bg-gradient-to-br from-sky-500 to-blue-700" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel min-w-0 overflow-hidden p-5 sm:p-6">
          <SectionHeader title="Distribusi kehadiran" description="Periode dan sesi terpilih" />
          {totalAtt ? (
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart><Pie data={attData} cx="50%" cy="50%" innerRadius="42%" outerRadius="62%" paddingAngle={3} dataKey="value" stroke="none" label={({ name, value }) => `${name} ${value}`} labelLine={false} style={{ fontSize: 10, fontWeight: 600, fill: "#26352e" }}>{attData.map((e, i) => <Cell key={e.name} style={{ fill: ATT_COLORS[i] }} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Belum ada data kehadiran pada periode ini</div>}
          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="flex items-end justify-between"><span className="text-sm text-muted-foreground">Tingkat kehadiran</span><strong className="font-mono text-2xl tracking-[-0.06em] text-primary">{rate}%</strong></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} /></div>
          </div>
        </section>
        <section className="surface-panel min-w-0 overflow-hidden p-5 sm:p-6">
          <SectionHeader title="Jadwal kelompok" description="Hari, kelompok, dan pengajar" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Hari</th>
                  <th className="py-2 pr-3 font-medium">Jam</th>
                  <th className="py-2 pr-3 font-medium">Kelompok</th>
                  <th className="py-2 font-medium">Pengajar</th>
                </tr>
              </thead>
              <tbody>
                {jadwals.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Belum ada jadwal</td></tr>
                ) : (
                  jadwals.map((j, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-3">{formatHari(j.hari)}</td>
                      <td className="py-2.5 pr-3 font-tabular text-muted-foreground">{formatTime(j.jam_mulai)} - {formatTime(j.jam_selesai)}</td>
                      <td className="py-2.5 pr-3">{j.kelompok?.sesi?.nama === "PAGI" ? "Pagi" : j.kelompok?.sesi?.nama === "SORE" ? "Sore" : ""} · K{j.kelompok?.nama}</td>
                      <td className="py-2.5 font-medium">{j.kelompok?.pengajar?.nama ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel min-w-0 p-5 sm:p-6">
          <SectionHeader title="Santri butuh perhatian" description="Penilaian kurang atau kehadiran yang perlu ditindaklanjuti." />
          {attention.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4" /> Semua santri dalam kondisi baik</div>
          ) : (
            <div className="mt-4 space-y-2">
              {attention.map((a, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                  <div className="rounded-md bg-amber-100 p-1.5 text-amber-700"><AlertTriangle className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium text-foreground">{a.nama} <span className="text-xs text-muted-foreground">({a.sesi})</span></p>
                    <p className="text-sm text-muted-foreground">{a.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="surface-panel min-w-0 p-5 sm:p-6">
          <SectionHeader title="Aktivitas bulan ini" description="Ringkasan kegiatan pemantauan" />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gradient-to-br from-primary to-teal-700 p-4 text-white">
              <div className="flex items-center gap-2 text-xs text-white/80"><BookOpen className="h-4 w-4" /> Perkembangan dinilai</div>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-[-0.06em]">{monthPerk}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 p-4 text-white">
              <div className="flex items-center gap-2 text-xs text-white/80"><Users className="h-4 w-4" /> Catatan presensi</div>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-[-0.06em]">{monthPresensi}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function currentMonthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}
function periodLabel(period: string): string {
  return PERIODS.find((x) => x.value === period)?.label ?? period
}