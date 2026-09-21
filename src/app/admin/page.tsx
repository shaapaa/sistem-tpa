"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-provider"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { StatCard } from "@/components/layout/stat-card"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, BookOpen, CalendarCheck, CalendarDays, GraduationCap, HeartPulse, UserCog, UserX, Users } from "lucide-react"

type PresensiRow = { status: string }
type JadwalRow = { id: string; sesi?: { id: string; nama: string; pengajar?: { nama: string } | null } | null }

const PERIODS = [
  { label: "Hari Ini", value: "TODAY" },
  { label: "7 Hari Terakhir", value: "LAST_7" },
  { label: "30 Hari Terakhir", value: "LAST_30" },
  { label: "Bulan Ini", value: "MONTH" },
  { label: "Custom", value: "CUSTOM" },
]
const SESI_JAM: Record<string, string> = { PAGI: "08.00–09.30", SORE: "16.00–17.30" }
const HARI_DB: Record<string, string> = { Sunday: "MINGGU", Monday: "SENIN", Tuesday: "SELASA", Wednesday: "RABU", Thursday: "KAMIS", Friday: "JUMAT", Saturday: "SABTU" }

function jakartaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date())
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
  return `${value("year")}-${value("month")}-${value("day")}`
}
function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}
function dayName(date: string) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "long" }).format(new Date(`${date}T12:00:00Z`))
  return HARI_DB[weekday]
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00Z`))
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [snapshotLoading, setSnapshotLoading] = useState(true)
  const [periodLoading, setPeriodLoading] = useState(true)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)
  const [periodError, setPeriodError] = useState<string | null>(null)
  const [santriAktif, setSantriAktif] = useState(0)
  const [pengajarAktif, setPengajarAktif] = useState(0)
  const [kelompokAktif, setKelompokAktif] = useState(0)
  const [akunAktif, setAkunAktif] = useState(0)
  const [iqraCount, setIqraCount] = useState(0)
  const [quranCount, setQuranCount] = useState(0)
  const [tanpaKlasifikasi, setTanpaKlasifikasi] = useState(0)
  const [santriPerSesi, setSantriPerSesi] = useState<Record<string, number>>({})
  const [presensi, setPresensi] = useState<PresensiRow[]>([])
  const [jadwal, setJadwal] = useState<JadwalRow[]>([])
  const today = useMemo(jakartaToday, [])
  const [period, setPeriod] = useState("TODAY")
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)
  const [jadwalDate, setJadwalDate] = useState(today)
  const supabase = createClient()

  const range = useMemo(() => {
    if (period === "TODAY") return { start: today, end: today }
    if (period === "LAST_7") return { start: addDays(today, -6), end: today }
    if (period === "LAST_30") return { start: addDays(today, -29), end: today }
    if (period === "MONTH") return { start: `${today.slice(0, 7)}-01`, end: today }
    return { start: customFrom, end: customTo }
  }, [customFrom, customTo, period, today])
  const rangeValid = Boolean(range.start && range.end && range.start <= range.end)
  const jadwalDateValid = rangeValid && jadwalDate >= range.start && jadwalDate <= range.end

  useEffect(() => {
    const fetchSnapshot = async () => {
      setSnapshotLoading(true)
      setSnapshotError(null)
      const [santriRes, pengajarRes, kelompokRes, akunRes, komposisiRes] = await Promise.all([
        supabase.from("santri").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("pengajar").select("id, profiles!inner(id)", { count: "exact", head: true }).not("profile_id", "is", null).eq("profiles.role", "PENGAJAR").eq("profiles.is_active", true),
        supabase.from("kelompok").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true).in("role", ["ADMIN", "PENGAJAR", "SANTRI"]),
        supabase.from("santri").select("keterangan, kelompok(sesi_id)").eq("is_active", true),
      ])
      const queryError = [santriRes, pengajarRes, kelompokRes, akunRes, komposisiRes].find((result) => result.error)?.error
      if (queryError) {
        setSnapshotError("Kondisi terkini tidak dapat dimuat. Silakan coba lagi.")
        setSnapshotLoading(false)
        return
      }
      const komposisi = (komposisiRes.data ?? []) as unknown as { keterangan: string | null; kelompok?: { sesi_id: string }[] | null }[]
      const perSesi: Record<string, number> = {}
      komposisi.forEach((santri) => { const sesiId = santri.kelompok?.[0]?.sesi_id; if (sesiId) perSesi[sesiId] = (perSesi[sesiId] ?? 0) + 1 })
      setSantriAktif(santriRes.count ?? 0)
      setPengajarAktif(pengajarRes.count ?? 0)
      setKelompokAktif(kelompokRes.count ?? 0)
      setAkunAktif(akunRes.count ?? 0)
      setIqraCount(komposisi.filter((santri) => santri.keterangan === "IQRA").length)
      setQuranCount(komposisi.filter((santri) => santri.keterangan === "QURAN").length)
      setTanpaKlasifikasi(komposisi.filter((santri) => santri.keterangan !== "IQRA" && santri.keterangan !== "QURAN").length)
      setSantriPerSesi(perSesi)
      setSnapshotLoading(false)
    }
    void fetchSnapshot()
  }, [])

  useEffect(() => {
    if (!rangeValid || !jadwalDateValid) return
    let cancelled = false
    const fetchPeriod = async () => {
      setPeriodLoading(true)
      setPeriodError(null)
      const [presensiRes, jadwalRes] = await Promise.all([
        supabase.from("presensi").select("status").gte("tanggal", range.start).lte("tanggal", range.end),
        supabase.from("jadwal_sesi").select("id, sesi(id, nama, pengajar(nama))").eq("hari", dayName(jadwalDate)).eq("is_active", true),
      ])
      if (cancelled) return
      const queryError = [presensiRes, jadwalRes].find((result) => result.error)?.error
      if (queryError) {
        setPeriodError("Ringkasan periode tidak dapat dimuat. Silakan coba lagi.")
      } else {
        setPresensi((presensiRes.data ?? []) as PresensiRow[])
        setJadwal((jadwalRes.data ?? []) as unknown as JadwalRow[])
      }
      setPeriodLoading(false)
    }
    void fetchPeriod()
    return () => { cancelled = true }
  }, [jadwalDate, jadwalDateValid, range.end, range.start, rangeValid])

  useEffect(() => {
    if (rangeValid && (jadwalDate < range.start || jadwalDate > range.end)) setJadwalDate(range.start)
  }, [jadwalDate, range.start, range.end, rangeValid])

  const presensiSummary = useMemo(() => ({
    hadir: presensi.filter((row) => row.status === "HADIR").length,
    izin: presensi.filter((row) => row.status === "IZIN").length,
    sakit: presensi.filter((row) => row.status === "SAKIT").length,
    alpa: presensi.filter((row) => row.status === "ALPHA").length,
  }), [presensi])
  const iqraPct = santriAktif ? Math.round((iqraCount / santriAktif) * 100) : 0
  const quranPct = santriAktif ? Math.round((quranCount / santriAktif) * 100) : 0
  const rangeLabel = period === "CUSTOM" ? `${formatDate(range.start)} – ${formatDate(range.end)}` : PERIODS.find((option) => option.value === period)?.label ?? "Periode"

  if (snapshotLoading) return <div className="space-y-6"><div className="h-24 animate-pulse rounded-2xl bg-muted" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div><div className="grid gap-6 lg:grid-cols-2"><div className="h-72 animate-pulse rounded-xl bg-muted" /><div className="h-72 animate-pulse rounded-xl bg-muted" /></div></div>
  if (snapshotError) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive sm:p-12">{snapshotError}</div>

  return <div className="space-y-6">
    <PageHeader eyebrow="TPA Baitul Yatama" title={`Selamat datang, ${profile?.nama || "Admin"}`} description="Pantau dan kelola aktivitas TPA Baitul Yatama" action={<div className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-right"><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Kondisi terkini</p><p className="mt-0.5 text-sm font-medium text-foreground">{formatDate(today)}</p></div>} />

    <section className="surface-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-foreground">Ringkasan Periode</p><p className="mt-1 text-xs text-muted-foreground">Filter ini hanya memengaruhi Presensi dan tanggal referensi Jadwal.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:flex"><div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Periode</Label><Select value={period} onValueChange={(value) => value && setPeriod(value)} items={PERIODS}><SelectTrigger className="h-9 w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>{period === "CUSTOM" && <><div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Mulai</Label><DatePicker value={customFrom} onChange={setCustomFrom} /></div><div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Selesai</Label><DatePicker value={customTo} onChange={setCustomTo} /></div></>}</div></div>
      {!rangeValid && <p className="mt-3 text-sm text-destructive">Tanggal mulai tidak boleh setelah tanggal selesai.</p>}
    </section>

    <div><div className="mb-3 flex items-center justify-end gap-3"><Badge variant="outline">Snapshot saat ini</Badge></div><section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Santri Aktif" value={santriAktif} detail="mengikuti pembelajaran" icon={Users} className="bg-gradient-to-br from-emerald-500 to-teal-700" href="/admin/santri" /><StatCard label="Pengajar Aktif" value={pengajarAktif} detail="master dengan akun aktif" icon={GraduationCap} className="bg-gradient-to-br from-indigo-500 to-violet-700" href="/admin/pengajar" /><StatCard label="Kelompok Aktif" value={kelompokAktif} detail="kelompok tersedia" icon={BookOpen} className="bg-gradient-to-br from-amber-400 to-orange-600" href="/admin/kelompok" /><StatCard label="Akun Aktif" value={akunAktif} detail="profile role valid" icon={UserCog} className="bg-gradient-to-br from-sky-500 to-blue-700" href="/admin/users" /></section></div>

    <div className="grid gap-6 lg:grid-cols-2"><section className="surface-panel p-5 sm:p-6"><SectionHeader title="Komposisi Santri" description="Berdasarkan jenis bacaan dan kelompok otomatis." />{santriAktif === 0 ? <div className="mt-5"><EmptyState message="Belum ada Santri aktif." /></div> : <div className="mt-5 space-y-5"><div className="flex items-end justify-between gap-4"><div><p className="text-3xl font-semibold tracking-tight text-foreground">{santriAktif}</p><p className="text-sm text-muted-foreground">Seluruh Santri aktif</p></div><Badge variant="outline">Kelompok A & B</Badge></div><div className="overflow-hidden rounded-full bg-muted"><div className="flex h-3"><span className="bg-emerald-600" style={{ width: `${iqraPct}%` }} /><span className="bg-indigo-500" style={{ width: `${quranPct}%` }} /></div></div><div className="grid grid-cols-2 gap-3"><CompositionItem label="Iqra · Kelompok A" value={iqraCount} pct={iqraPct} tone="emerald" /><CompositionItem label="Al-Qur'an · Kelompok B" value={quranCount} pct={quranPct} tone="indigo" /></div>{tanpaKlasifikasi > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{tanpaKlasifikasi} Santri aktif belum memiliki klasifikasi Iqra atau Al-Qur&apos;an dan tidak dimasukkan ke Kelompok A/B.</p>}</div>}</section>
      <section className="surface-panel p-5 sm:p-6"><SectionHeader title="Presensi" description={rangeValid ? rangeLabel : "Periode tidak valid"} />{!rangeValid ? <div className="mt-5"><EmptyState message="Pilih rentang tanggal yang valid untuk melihat presensi." /></div> : periodLoading ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div> : periodError ? <p className="mt-5 text-sm text-destructive">{periodError}</p> : presensi.length === 0 ? <div className="mt-5"><EmptyState message={period === "TODAY" ? "Belum ada data presensi hari ini." : "Belum ada data presensi pada periode ini."} hint="Presensi akan muncul setelah Pengajar melakukan pencatatan." /></div> : <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><StatusItem label="Hadir" value={presensiSummary.hadir} icon={CalendarCheck} tone="text-emerald-700 bg-emerald-50" /><StatusItem label="Izin" value={presensiSummary.izin} icon={CalendarDays} tone="text-amber-700 bg-amber-50" /><StatusItem label="Sakit" value={presensiSummary.sakit} icon={HeartPulse} tone="text-orange-700 bg-orange-50" /><StatusItem label="Alpa" value={presensiSummary.alpa} icon={UserX} tone="text-rose-700 bg-rose-50" /></div>}</section></div>

    <section className="surface-panel p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionHeader title="Jadwal Sesi" description={jadwalDateValid ? `Jadwal berulang untuk ${formatDate(jadwalDate)}.` : "Pilih tanggal referensi dalam periode."} /><div className="w-full sm:w-52"><Label className="text-[10px] text-muted-foreground">Tanggal referensi jadwal</Label><div className="mt-1"><DatePicker value={jadwalDate} onChange={setJadwalDate} /></div></div></div>{!jadwalDateValid ? <div className="mt-5"><EmptyState message="Tanggal jadwal harus berada dalam periode yang dipilih." /></div> : periodLoading ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-xl bg-muted" />)}</div> : periodError ? <p className="mt-5 text-sm text-destructive">{periodError}</p> : jadwal.length === 0 ? <div className="mt-5"><EmptyState message="Belum ada jadwal untuk tanggal ini." hint="Jadwal mengikuti hari dalam minggu dari tanggal referensi." /></div> : <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{jadwal.map((item) => <ScheduleItem key={item.id} item={item} santriCount={santriPerSesi[item.sesi?.id ?? ""] ?? 0} />)}</div>}</section>
  </div>
}

function CompositionItem({ label, value, pct, tone }: { label: string; value: number; pct: number; tone: "emerald" | "indigo" }) { return <div className={`rounded-xl border p-4 ${tone === "emerald" ? "border-emerald-200/70 bg-emerald-50/60" : "border-indigo-200/70 bg-indigo-50/60"}`}><p className={`text-xs font-medium uppercase tracking-wider ${tone === "emerald" ? "text-emerald-700" : "text-indigo-700"}`}>{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{pct}% dari Santri aktif</p></div> }
function StatusItem({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Activity; tone: string }) { return <div className={`rounded-xl p-3 ${tone}`}><Icon className="h-4 w-4" /><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs font-medium">{label}</p></div> }
function ScheduleItem({ item, santriCount }: { item: JadwalRow; santriCount: number }) { const sesi = item.sesi?.nama ?? ""; return <article className="rounded-xl border border-border/70 bg-muted/[0.18] p-4 transition-colors hover:bg-muted/40"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{sesi === "PAGI" ? "Sesi Pagi" : sesi === "SORE" ? "Sesi Sore" : "Sesi"}</p><p className="mt-1 text-lg font-semibold text-foreground">Iqra & Al-Qur&apos;an</p></div><Badge variant="outline" className="shrink-0">{SESI_JAM[sesi] ?? "-"}</Badge></div><div className="mt-4 space-y-2 border-t border-border/70 pt-3 text-sm"><div className="flex items-center gap-2 text-muted-foreground"><GraduationCap className="h-4 w-4" /><span>{item.sesi?.pengajar?.nama ?? "Pengajar belum ditugaskan"}</span></div><div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /><span>{santriCount} Santri aktif dalam sesi</span></div></div></article> }
