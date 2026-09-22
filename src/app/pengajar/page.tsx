"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Calendar, Clock, ArrowRight, AlertTriangle, ClipboardList, CalendarCheck, Users, TrendingUp, UserX, ClipboardCheck, ListChecks, FileText } from "lucide-react";
import Link from "next/link";
import { formatHari, formatTime, urutkanJadwalMenurutHari } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
const PERIODS = [
  { label: "Hari ini", value: "today" },
  { label: "Minggu ini", value: "week" },
  { label: "Bulan ini", value: "month" },
  { label: "Custom", value: "custom" },
];

interface Jadwal { id: string; hari: string; jam_mulai: string; jam_selesai: string; sesi?: { nama: string } | null }
type PresensiRow = { status: string; santri_id: string; tanggal: string | null }
type GerakanKomponenRow = {
  status: string
  perkembangan_gerakan_salat?: { santri_id: string; tanggal: string } | null
}

export default function PengajarDashboard() {
  const { user } = useAuth();
  const [jadwals, setJadwals] = useState<Jadwal[]>([]);
  const [santriCount, setSantriCount] = useState(0);
  const [presensi, setPresensi] = useState<PresensiRow[]>([]);
  const [attention, setAttention] = useState<{ nama: string; reason: string; id: string }[]>([]);
  const [monthPerk, setMonthPerk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) { setLoading(false); return; }
      setLoading(true)
      setLoadError("")
      const monthStart = currentMonthStart();
      const { data: pengajar, error: pengajarError } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single();
      if (pengajarError || !pengajar) { setLoadError("Profil Pengajar tidak dapat dimuat."); setLoading(false); return; }

      const { data: kelompokData, error: kelompokError } = await supabase.from("kelompok").select("id");
      if (kelompokError) { setLoadError("Penugasan sesi tidak dapat dimuat."); setLoading(false); return; }
      const kelompokIds = (kelompokData ?? []).map((k) => k.id);
      if (kelompokIds.length === 0) { setLoadError("Belum ada jadwal sesi yang ditugaskan kepada Anda. Hubungi Admin TPA."); setLoading(false); return; }

      const { data: santriRes, error: santriError } = await supabase.from("santri").select("id, nama").in("kelompok_id", kelompokIds).eq("is_active", true).order("nama");
      if (santriError) { setLoadError("Daftar Santri tidak dapat dimuat."); setLoading(false); return; }
      type SantriRow = { id: string; nama: string }
      const santris = (santriRes ?? []) as unknown as SantriRow[]
      const santriIds = santris.map((s) => s.id)
      setSantriCount(santris.length)
      if (santriIds.length === 0) { setLoadError("Belum ada Santri aktif pada sesi yang ditugaskan kepada Anda."); setLoading(false); return }

      const [jadwalRes, presensiRes, bacaanRes, cicilanRes, doaRes, legacySalatRes, gerakanRes, gerakanKomponenRes, niatRes] = await Promise.all([
        // Jangan hanya mengandalkan RLS di sini. Penugasan pengajar sekarang
        // berada di jadwal_sesi_pengajar, sehingga dashboard harus selalu
        // menyaring slot yang memang ditugaskan admin kepada pengajar ini.
        supabase.from("jadwal_sesi").select("id, hari, jam_mulai, jam_selesai, sesi(nama), jadwal_sesi_pengajar!inner(pengajar_id)").eq("jadwal_sesi_pengajar.pengajar_id", pengajar.id).order("hari"),
        supabase.from("presensi").select("status, santri_id, tanggal").in("kelompok_id", kelompokIds),
        supabase.from("perkembangan_bacaan").select("santri_id, status, tanggal").in("santri_id", santriIds),
        supabase.from("hafalan_surat_cicilan").select("tanggal, status, hafalan_santri(santri_id)").in("hafalan_santri.santri_id", santriIds),
        supabase.from("perkembangan_hafalan_doa").select("santri_id, status, tanggal").in("santri_id", santriIds),
        supabase.from("praktik_salat").select("santri_id, status, tanggal").in("santri_id", santriIds),
        supabase.from("perkembangan_gerakan_salat").select("santri_id, tanggal").in("santri_id", santriIds),
        supabase.from("perkembangan_gerakan_salat_komponen").select("status, perkembangan_gerakan_salat!inner(santri_id, tanggal)").in("perkembangan_gerakan_salat.santri_id", santriIds),
        supabase.from("perkembangan_niat_salat").select("santri_id, status, tanggal").in("santri_id", santriIds),
      ]);

      setJadwals(urutkanJadwalMenurutHari((jadwalRes.data ?? []) as unknown as Jadwal[]));
      setPresensi((presensiRes.data ?? []) as unknown as PresensiRow[])

      // Month perkembangan count
      type PerkRow = { santri_id: string; status: string | null; tanggal: string }
      type CicilanRow = { tanggal: string; status: string | null; hafalan_santri?: { santri_id: string } | null }
      const bacaanRows = (bacaanRes.data ?? []) as unknown as PerkRow[]
      const cicilanRows = (cicilanRes.data ?? []) as unknown as CicilanRow[]
      const doaRows = (doaRes.data ?? []) as unknown as PerkRow[]
      const legacySalatRows = (legacySalatRes.data ?? []) as unknown as PerkRow[]
      const gerakanRows = (gerakanRes.data ?? []) as unknown as PerkRow[]
      const niatRows = (niatRes.data ?? []) as unknown as PerkRow[]
      const gerakanKomponenRows = (gerakanKomponenRes.data ?? []) as unknown as GerakanKomponenRow[]
      setMonthPerk(
        bacaanRows.filter((r) => r.tanggal >= monthStart).length +
        cicilanRows.filter((r) => r.tanggal >= monthStart).length +
        doaRows.filter((r) => r.tanggal >= monthStart).length +
        legacySalatRows.filter((r) => r.tanggal >= monthStart).length +
        gerakanRows.filter((r) => r.tanggal >= monthStart).length +
        niatRows.filter((r) => r.tanggal >= monthStart).length
      )

      // Attention: alpha >= 2 this month + KURANG statuses
      const alphaCount: Record<string, number> = {}
      ;((presensiRes.data ?? []) as unknown as PresensiRow[]).forEach((r) => {
        if (r.status === "ALPHA" && r.tanggal && r.tanggal >= monthStart) alphaCount[r.santri_id] = (alphaCount[r.santri_id] ?? 0) + 1
      })
      const reasons: Record<string, string> = {}
      const addReason = (id: string, reason: string) => { if (!reasons[id]) reasons[id] = reason }
      const KURANG = (s: string | null) => s === "KURANG_LANCAR" || s === "TIDAK_LANCAR"
      bacaanRows.forEach((r) => { if (KURANG(r.status) && r.tanggal >= monthStart) addReason(r.santri_id, "Perkembangan bacaan dinilai Kurang/Tidak Lancar") })
      cicilanRows.forEach((r) => { const sid = r.hafalan_santri?.santri_id; if (sid && KURANG(r.status) && r.tanggal >= monthStart) addReason(sid, "Hafalan dinilai Kurang/Tidak Lancar") })
      doaRows.forEach((r) => { if (KURANG(r.status) && r.tanggal >= monthStart) addReason(r.santri_id, "Hafalan doa dinilai Kurang/Tidak Lancar") })
      legacySalatRows.forEach((r) => { if (r.status === "BUTUH_BIMBINGAN" && r.tanggal >= monthStart) addReason(r.santri_id, "Praktik salat membutuhkan bimbingan") })
      niatRows.forEach((r) => { if (r.status === "BUTUH_BIMBINGAN" && r.tanggal >= monthStart) addReason(r.santri_id, "Niat salat membutuhkan bimbingan") })
      gerakanKomponenRows.forEach((r) => {
        const santriId = r.perkembangan_gerakan_salat?.santri_id
        const tanggal = r.perkembangan_gerakan_salat?.tanggal
        if (santriId && tanggal && tanggal >= monthStart && r.status === "BUTUH_BIMBINGAN") addReason(santriId, "Gerakan salat membutuhkan bimbingan")
      })

      const attList: { nama: string; reason: string; id: string }[] = []
      santris.forEach((s) => {
        const reason = reasons[s.id] ?? (alphaCount[s.id] && alphaCount[s.id] >= 2 ? `${alphaCount[s.id]}x tidak hadir (alpha) bulan ini` : null)
        if (reason) attList.push({ nama: s.nama, reason, id: s.id })
      })
      setAttention(attList)
      setLoading(false)
    };
    fetchData();
  }, [user]);

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

  const attendance = useMemo(() => {
    const a = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
    presensi.forEach((row) => {
      const t = row.tanggal
      if (!t) return
      if (range.from && t < range.from) return
      if (range.to && t > range.to) return
      if (row.status === "HADIR") a.hadir++
      else if (row.status === "IZIN") a.izin++
      else if (row.status === "SAKIT") a.sakit++
      else if (row.status === "ALPHA") a.alpha++
    })
    return a
  }, [presensi, range])

  const totalAtt = attendance.hadir + attendance.izin + attendance.sakit + attendance.alpha
  const attRate = totalAtt ? Math.round((attendance.hadir / totalAtt) * 100) : 0
  const hariIni = hariKerjaJakarta()
  const tugasHariIni = jadwals.filter((jadwal) => jadwal.hari === hariIni)

  if (loading) return <div className="h-40 rounded-xl bg-muted animate-pulse" />
  if (loadError) return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
      <UserX className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{loadError}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Ruang pengajar" title="Dashboard Pengajar" description={`Ringkasan tugas dan perkembangan santri pada ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`} />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Periode</Label>
            <Select value={period} onValueChange={(v) => v && setPeriod(v)} items={PERIODS}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {period === "custom" && <><div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Dari</Label><DatePicker value={customFrom} onChange={setCustomFrom} /></div><div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Sampai</Label><DatePicker value={customTo} onChange={setCustomTo} /></div></>}
          <div className="xl:ml-auto">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Akses cepat</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[{ href: "/pengajar/presensi", label: "Presensi", icon: ClipboardCheck }, { href: "/pengajar/perkembangan", label: "Perkembangan", icon: TrendingUp }, { href: "/pengajar/jadwal", label: "Jadwal", icon: Calendar }, { href: "/pengajar/rekap-perkembangan", label: "Rekap", icon: ListChecks }, { href: "/pengajar/laporan", label: "Laporan", icon: FileText }].map((item) => <Link key={item.href} href={item.href} className="flex min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-all hover:border-primary/35 hover:shadow-sm"><span className="rounded-md bg-primary/10 p-1 text-primary"><item.icon className="h-3.5 w-3.5 shrink-0" /></span>{item.label}</Link>)}
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border border-l-4 border-l-primary bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader title="Tugas hari ini" description={tugasHariIni.length ? "Sesi yang menjadi jadwal mengajar Anda hari ini." : "Tidak ada sesi mengajar yang dijadwalkan hari ini."} />
        {tugasHariIni.length ? <div className="mt-4 space-y-3">{tugasHariIni.map((j) => <div key={j.id} className="flex flex-col gap-4 border-b border-border/70 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-foreground">{j.sesi?.nama === "PAGI" ? "Sesi Pagi" : j.sesi?.nama === "SORE" ? "Sesi Sore" : "Sesi mengajar"}</p><p className="mt-1 text-sm text-muted-foreground"><span className="font-tabular">{formatTime(j.jam_mulai)}–{formatTime(j.jam_selesai)}</span> · Kelompok A (Iqra) & Kelompok B (Al-Qur&apos;an)</p></div><div className="flex flex-wrap gap-2"><Link href="/pengajar/presensi" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Mulai Presensi</Link><Link href="/pengajar/perkembangan" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground">Input Perkembangan</Link></div></div>)}</div> : <div className="mt-4 flex flex-wrap gap-2"><Link href="/pengajar/jadwal" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground">Lihat Jadwal</Link></div>}
      </section>

      <section>
        <SectionHeader title="Ringkasan kerja" description={`Periode: ${periodLabel(period)}`} />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link href="/pengajar/perkembangan" className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/35 hover:shadow-md"><span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" /></span><p className="mt-3 text-2xl font-semibold text-foreground">{santriCount}</p><p className="text-sm font-medium">Santri</p><p className="mt-1 text-xs text-muted-foreground">dalam cakupan Anda</p></Link>
          <Link href="/pengajar/rekap-perkembangan" className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/35 hover:shadow-md"><span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary"><TrendingUp className="h-4 w-4" /></span><p className="mt-3 text-2xl font-semibold text-foreground">{monthPerk}</p><p className="text-sm font-medium">Perkembangan</p><p className="mt-1 text-xs text-muted-foreground">catatan bulan ini</p></Link>
          <Link href="/pengajar/presensi" className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/35 hover:shadow-md"><span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary"><CalendarCheck className="h-4 w-4" /></span><p className="mt-3 text-2xl font-semibold text-foreground">{attRate}%</p><p className="text-sm font-medium">Kehadiran</p><p className="mt-1 text-xs text-muted-foreground">{attendance.hadir} hadir dari {totalAtt}</p></Link>
          <Link href="/pengajar/jadwal" className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/35 hover:shadow-md"><span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary"><Calendar className="h-4 w-4" /></span><p className="mt-3 text-2xl font-semibold text-foreground">{jadwals.length}</p><p className="text-sm font-medium">Jadwal</p><p className="mt-1 text-xs text-muted-foreground">slot mengajar mingguan</p></Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel border-l-4 border-l-primary p-5 shadow-sm sm:p-6">
          <SectionHeader title="Kehadiran" description={`Ringkasan ${periodLabel(period).toLowerCase()}.`} actions={<Link href="/pengajar/presensi" className="action-link inline-flex items-center gap-1">Buka presensi <ArrowRight className="h-3.5 w-3.5" /></Link>} />
          {totalAtt ? <><div className="mt-4 flex items-end justify-between"><div><p className="text-2xl font-semibold text-foreground">{attRate}%</p><p className="text-xs text-muted-foreground">tingkat kehadiran</p></div><p className="text-sm text-muted-foreground">{attendance.hadir} dari {totalAtt} presensi</p></div><div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted"><div className="bg-emerald-500" style={{ width: `${(attendance.hadir / totalAtt) * 100}%` }} /><div className="bg-amber-400" style={{ width: `${(attendance.izin / totalAtt) * 100}%` }} /><div className="bg-orange-400" style={{ width: `${(attendance.sakit / totalAtt) * 100}%` }} /><div className="bg-rose-500" style={{ width: `${(attendance.alpha / totalAtt) * 100}%` }} /></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800"><span className="block text-emerald-700/70">Hadir</span><strong>{attendance.hadir}</strong></div><div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800"><span className="block text-amber-700/70">Izin</span><strong>{attendance.izin}</strong></div><div className="rounded-lg bg-orange-50 px-3 py-2 text-orange-800"><span className="block text-orange-700/70">Sakit</span><strong>{attendance.sakit}</strong></div><div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800"><span className="block text-rose-700/70">Alpha</span><strong>{attendance.alpha}</strong></div></div></> : <div className="mt-4 rounded-lg bg-muted/50 px-4 py-5 text-sm text-muted-foreground">Belum ada data kehadiran pada periode ini.</div>}
        </section>
        <section className="surface-panel min-w-0 border-l-4 border-l-amber-400 p-5 shadow-sm sm:p-6">
          <SectionHeader title="Anak yang butuh perhatian" description="Penilaian kurang atau kehadiran yang perlu ditindaklanjuti." actions={<Link href="/pengajar/perkembangan" className="action-link inline-flex items-center gap-1">Input perkembangan <ArrowRight className="h-3.5 w-3.5" /></Link>} />
          {attention.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><ClipboardList className="h-4 w-4" /> Semua santri dalam kondisi baik</div>
          ) : (
            <div className="mt-4 space-y-2">
              {attention.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-amber-100 p-1.5 text-amber-700"><AlertTriangle className="h-4 w-4" /></div>
                    <div>
                      <p className="font-medium text-foreground">{a.nama}</p>
                      <p className="text-sm text-muted-foreground">{a.reason}</p>
                    </div>
                  </div>
                  <Link href={`/pengajar/perkembangan`} className="text-xs font-medium text-primary underline-offset-4 hover:underline">Catat</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <SectionHeader title="Jadwal mengajar" description="Hari dan jam mengajar Anda." actions={<Link href="/pengajar/jadwal" className="action-link inline-flex items-center gap-1">Lihat semua <ArrowRight className="h-3.5 w-3.5" /></Link>} />
        {jadwals.length === 0 ? (
          <div className="surface-inset mt-4 p-5 text-center sm:p-8"><Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" /><p className="text-sm text-muted-foreground">Belum ada jadwal sesi yang ditugaskan kepada Anda.</p></div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {jadwals.map((j) => (
              <div key={j.id} className="rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/35 hover:shadow-md sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Calendar className="h-4 w-4" /></div>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{formatHari(j.hari)}</span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-medium text-foreground">{j.sesi?.nama === "PAGI" ? "Sesi Pagi" : j.sesi?.nama === "SORE" ? "Sesi Sore" : "Sesi"}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span className="font-tabular">{formatTime(j.jam_mulai)} - {formatTime(j.jam_selesai)}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
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

function hariKerjaJakarta(): string {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "long" }).format(new Date())
  return ({ Monday: "SENIN", Tuesday: "SELASA", Wednesday: "RABU", Thursday: "KAMIS", Friday: "JUMAT", Saturday: "SABTU", Sunday: "MINGGU" } as Record<string, string>)[weekday]
}
