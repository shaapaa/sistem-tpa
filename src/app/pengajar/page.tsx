"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Calendar, ArrowRight, AlertTriangle, ClipboardList, CalendarCheck, CalendarX, Activity, Users } from "lucide-react";
import Link from "next/link";
import { formatHari, formatTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { MetricRail } from "@/components/layout/metric-rail";
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

export default function PengajarDashboard() {
  const { user } = useAuth();
  const [jadwals, setJadwals] = useState<Jadwal[]>([]);
  const [santriCount, setSantriCount] = useState(0);
  const [presensi, setPresensi] = useState<PresensiRow[]>([]);
  const [attention, setAttention] = useState<{ nama: string; reason: string; id: string }[]>([]);
  const [monthPerk, setMonthPerk] = useState(0);

  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const monthStart = currentMonthStart();
      const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single();
      if (!pengajar) return;

      const { data: kelompokData } = await supabase.from("kelompok").select("id").eq("pengajar_id", pengajar.id);
      const kelompokIds = (kelompokData ?? []).map((k) => k.id);
      if (kelompokIds.length === 0) return;

      const { data: santriRes } = await supabase.from("santri").select("id, nama").in("kelompok_id", kelompokIds).order("nama");
      type SantriRow = { id: string; nama: string }
      const santris = (santriRes ?? []) as unknown as SantriRow[]
      const santriIds = santris.map((s) => s.id)
      setSantriCount(santris.length)
      if (santriIds.length === 0) return

      const [jadwalRes, presensiRes, bacaanRes, cicilanRes, doaRes, salatRes] = await Promise.all([
        supabase.from("jadwal").select("id, hari, jam_mulai, jam_selesai").in("kelompok_id", kelompokIds).order("hari"),
        supabase.from("presensi").select("status, santri_id, tanggal").in("kelompok_id", kelompokIds),
        supabase.from("perkembangan_bacaan").select("santri_id, status, tanggal").in("santri_id", santriIds),
        supabase.from("hafalan_surat_cicilan").select("tanggal, hafalan_santri(santri_id)").in("hafalan_santri.santri_id", santriIds),
        supabase.from("perkembangan_hafalan_doa").select("santri_id, status, tanggal").in("santri_id", santriIds),
        supabase.from("praktik_salat").select("santri_id, status, tanggal").in("santri_id", santriIds),
      ]);

      setJadwals((jadwalRes.data ?? []) as unknown as Jadwal[]);
      setPresensi((presensiRes.data ?? []) as unknown as PresensiRow[])

      // Month perkembangan count
      type PerkRow = { santri_id: string; status: string | null; tanggal: string }
      type CicilanRow = { tanggal: string; hafalan_santri?: { santri_id: string } | null }
      const bacaanRows = (bacaanRes.data ?? []) as unknown as PerkRow[]
      const cicilanRows = (cicilanRes.data ?? []) as unknown as CicilanRow[]
      const doaRows = (doaRes.data ?? []) as unknown as PerkRow[]
      const salatRows = (salatRes.data ?? []) as unknown as PerkRow[]
      setMonthPerk(
        bacaanRows.filter((r) => r.tanggal >= monthStart).length +
        cicilanRows.filter((r) => r.tanggal >= monthStart).length +
        doaRows.filter((r) => r.tanggal >= monthStart).length +
        salatRows.filter((r) => r.tanggal >= monthStart).length
      )

      // Attention: alpha >= 2 this month + KURANG statuses
      const alphaCount: Record<string, number> = {}
      ;((presensiRes.data ?? []) as unknown as PresensiRow[]).forEach((r) => {
        if (r.status === "ALPHA" && r.tanggal && r.tanggal >= monthStart) alphaCount[r.santri_id] = (alphaCount[r.santri_id] ?? 0) + 1
      })
      const reasons: Record<string, string> = {}
      const addReason = (id: string, reason: string) => { if (!reasons[id]) reasons[id] = reason }
      bacaanRows.forEach((r) => addReason(r.santri_id, "Perkembangan bacaan dinilai Tidak Lancar"))
      cicilanRows.forEach((r) => { const sid = r.hafalan_santri?.santri_id; if (sid) addReason(sid, "Hafalan dinilai Tidak Lancar") })
      doaRows.forEach((r) => addReason(r.santri_id, "Hafalan doa dinilai Tidak Lancar"))
      salatRows.forEach((r) => addReason(r.santri_id, "Praktik salat membutuhkan bimbingan"))

      const attList: { nama: string; reason: string; id: string }[] = []
      santris.forEach((s) => {
        const reason = reasons[s.id] ?? (alphaCount[s.id] && alphaCount[s.id] >= 2 ? `${alphaCount[s.id]}x tidak hadir (alpha) bulan ini` : null)
        if (reason) attList.push({ nama: s.nama, reason, id: s.id })
      })
      setAttention(attList)
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

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Ruang pengajar" title="Dashboard monitoring" description="Pantau santri dan kehadiran untuk evaluasi ke orang tua." />
      <MetricRail items={[
        { label: "Santri", value: santriCount, detail: "dalam kelompok Anda", href: "/pengajar/perkembangan", tone: "primary" },
        { label: "Jadwal aktif", value: jadwals.length, detail: "slot mengajar mingguan", href: "/pengajar/jadwal" },
        { label: "Perkembangan", value: monthPerk, detail: "pada periode terpilih", href: "/pengajar/rekap-perkembangan" },
        { label: "Kehadiran", value: `${attRate}%`, detail: "tingkat periode", href: "/pengajar/presensi", tone: "amber" },
      ]} />

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
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Hadir", value: attendance.hadir, color: "text-primary", bg: "bg-primary/10", icon: CalendarCheck },
            { label: "Izin", value: attendance.izin, color: "text-amber-700", bg: "bg-amber-100", icon: CalendarX },
            { label: "Sakit", value: attendance.sakit, color: "text-amber-700", bg: "bg-amber-100", icon: Activity },
            { label: "Alpha", value: attendance.alpha, color: "text-destructive", bg: "bg-red-100", icon: CalendarX },
            { label: "Persentase", value: `${attRate}%`, color: "text-primary", bg: "bg-primary/10", icon: Users },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border p-4">
              <div className={`mb-2 inline-flex rounded-md p-1.5 ${c.bg} ${c.color}`}><c.icon className="h-4 w-4" /></div>
              <p className="font-mono text-2xl font-semibold tracking-[-0.04em] text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          ))}
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
                  <div className="text-sm font-medium text-foreground">{j.jam_mulai.slice(0, 5) === "07:30" ? "Sesi Pagi" : "Sesi Sore"}</div>
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