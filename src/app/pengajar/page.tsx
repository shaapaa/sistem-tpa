"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Calendar, ArrowRight, AlertTriangle, ClipboardList, CalendarCheck, CalendarX, Activity, Users, TrendingUp, UserX, BookMarked } from "lucide-react";
import Link from "next/link";
import { formatHari, formatTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { IslamicBanner } from "@/components/layout/islamic-banner";
import { SectionHeader } from "@/components/layout/section-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#376b59", "#b58b4b", "#b85b4b", "#768078"];
const PERIODS = [
  { label: "Hari ini", value: "today" },
  { label: "Minggu ini", value: "week" },
  { label: "Bulan ini", value: "month" },
  { label: "Custom", value: "custom" },
];

interface Jadwal { id: string; hari: string; jam_mulai: string; jam_selesai: string }
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
      if (kelompokError) { setLoadError("Penugasan kelompok tidak dapat dimuat."); setLoading(false); return; }
      const kelompokIds = (kelompokData ?? []).map((k) => k.id);
      if (kelompokIds.length === 0) { setLoadError("Belum ada kelompok yang ditugaskan kepada Anda. Hubungi Admin TPA."); setLoading(false); return; }

      const { data: santriRes, error: santriError } = await supabase.from("santri").select("id, nama").in("kelompok_id", kelompokIds).eq("is_active", true).order("nama");
      if (santriError) { setLoadError("Daftar Santri tidak dapat dimuat."); setLoading(false); return; }
      type SantriRow = { id: string; nama: string }
      const santris = (santriRes ?? []) as unknown as SantriRow[]
      const santriIds = santris.map((s) => s.id)
      setSantriCount(santris.length)
      if (santriIds.length === 0) { setLoadError("Belum ada Santri aktif pada kelompok Anda."); setLoading(false); return }

      const [jadwalRes, presensiRes, bacaanRes, cicilanRes, doaRes, legacySalatRes, gerakanRes, gerakanKomponenRes, niatRes] = await Promise.all([
        supabase.from("jadwal_sesi").select("id, hari, jam_mulai, jam_selesai").order("hari"),
        supabase.from("presensi").select("status, santri_id, tanggal").in("kelompok_id", kelompokIds),
        supabase.from("perkembangan_bacaan").select("santri_id, status, tanggal").in("santri_id", santriIds),
        supabase.from("hafalan_surat_cicilan").select("tanggal, status, hafalan_santri(santri_id)").in("hafalan_santri.santri_id", santriIds),
        supabase.from("perkembangan_hafalan_doa").select("santri_id, status, tanggal").in("santri_id", santriIds),
        supabase.from("praktik_salat").select("santri_id, status, tanggal").in("santri_id", santriIds),
        supabase.from("perkembangan_gerakan_salat").select("santri_id, tanggal").in("santri_id", santriIds),
        supabase.from("perkembangan_gerakan_salat_komponen").select("status, perkembangan_gerakan_salat!inner(santri_id, tanggal)").in("perkembangan_gerakan_salat.santri_id", santriIds),
        supabase.from("perkembangan_niat_salat").select("santri_id, status, tanggal").in("santri_id", santriIds),
      ]);

      setJadwals((jadwalRes.data ?? []) as unknown as Jadwal[]);
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
  const attData = [
    { name: "Hadir", value: attendance.hadir },
    { name: "Izin", value: attendance.izin },
    { name: "Sakit", value: attendance.sakit },
    { name: "Alpha", value: attendance.alpha },
  ].filter((d) => d.value > 0)

  if (loading) return <div className="h-40 rounded-xl bg-muted animate-pulse" />
  if (loadError) return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
      <UserX className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{loadError}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Ruang pengajar" title="Dashboard monitoring" description="Pantau santri dan kehadiran untuk evaluasi ke orang tua." />
      <IslamicBanner text="Sampaikanlah dariku walau satu ayat." source="HR. Bukhari" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Santri" value={santriCount} detail="dalam kelompok Anda" icon={Users} className="bg-gradient-to-br from-emerald-500 to-teal-700" href="/pengajar/perkembangan" />
        <StatCard label="Jadwal aktif" value={jadwals.length} detail="slot mengajar mingguan" icon={Calendar} className="bg-gradient-to-br from-indigo-500 to-violet-700" href="/pengajar/jadwal" />
        <StatCard label="Perkembangan" value={monthPerk} detail="pada periode terpilih" icon={TrendingUp} className="bg-gradient-to-br from-violet-500 to-purple-700" href="/pengajar/rekap-perkembangan" />
        <StatCard label="Kehadiran" value={`${attRate}%`} detail="tingkat periode" icon={CalendarCheck} className="bg-gradient-to-br from-amber-400 to-orange-600" href="/pengajar/presensi" />
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
        </div>
      </div>

      <section>
        <SectionHeader title="Ringkasan kehadiran" description={`Periode: ${periodLabel(period)}`} />
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          <StatCard label="Hadir" value={attendance.hadir} icon={CalendarCheck} className="bg-gradient-to-br from-emerald-500 to-teal-700" />
          <StatCard label="Izin" value={attendance.izin} icon={CalendarX} className="bg-gradient-to-br from-amber-400 to-orange-600" />
          <StatCard label="Sakit" value={attendance.sakit} icon={Activity} className="bg-gradient-to-br from-orange-400 to-red-500" />
          <StatCard label="Alpha" value={attendance.alpha} icon={UserX} className="bg-gradient-to-br from-rose-500 to-red-600" />
          <StatCard label="Persentase" value={`${attRate}%`} icon={BookMarked} className="bg-gradient-to-br from-sky-500 to-blue-700" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel min-w-0 overflow-hidden p-5 sm:p-6">
          <SectionHeader title="Distribusi kehadiran" description="Periode terpilih" />
          {totalAtt ? (
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart><Pie data={attData} cx="50%" cy="50%" innerRadius="42%" outerRadius="62%" paddingAngle={3} dataKey="value" stroke="none" label={({ name, value }) => `${name} ${value}`} labelLine={false} style={{ fontSize: 10, fontWeight: 600, fill: "#26352e" }}>{attData.map((e, i) => <Cell key={e.name} style={{ fill: COLORS[i] }} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Belum ada data kehadiran pada periode ini</div>}
        </section>
        <section className="surface-panel min-w-0 p-5 sm:p-6">
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
        <SectionHeader title="Jadwal mengajar" description="Hari dan jam mengajar Anda." actions={<Link href="/pengajar/presensi" className="action-link inline-flex items-center gap-1">Input presensi <ArrowRight className="h-3.5 w-3.5" /></Link>} />
        {jadwals.length === 0 ? (
          <div className="surface-inset mt-4 p-5 text-center sm:p-8"><Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" /><p className="text-sm text-muted-foreground">Belum ada jadwal</p></div>
        ) : (
          <div className="mt-4 divide-y divide-border/60 border-y border-border/70">
            {jadwals.map((j) => (
              <div key={j.id} className="flex items-center justify-between px-3 py-3 sm:px-4">
                <div>
                  <div className="text-sm font-medium text-foreground">{j.jam_mulai.slice(0, 5) === "08:00" ? "Sesi Pagi" : "Sesi Sore"}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{formatHari(j.hari)} · <span className="font-tabular">{formatTime(j.jam_mulai)} - {formatTime(j.jam_selesai)}</span></div>
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
