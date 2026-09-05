"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, BookHeart, AlertTriangle, CalendarCheck, CalendarX, Activity, UserX, TrendingUp } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/layout/stat-card";
import { IslamicBanner } from "@/components/layout/islamic-banner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const TARGET_SURAT = 38; // Juz 30 + Al-Fatihah

type PresensiRow = { id: string; status: string; tanggal: string }
type CicilanRow = { id: string; tanggal: string; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; hafalan_santri?: { surat?: { nama: string; jumlah_ayat: number } | null } | null }
type DoaRow = { id: string; tanggal: string; status: string | null; catatan: string | null; doa?: { nama: string } | null }
type BacaanRow = { id: string; tanggal: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null }
type PraktikRow = { id: string; tanggal: string; status: string | null; catatan: string | null; jenis_salat?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; status: string | null; catatan: string | null; komponen_salat?: { nama: string } | null }

const STATUS_BADGE: Record<string, "success" | "warning" | "destructive"> = {
  LANCAR: "success",
  KURANG_LANCAR: "warning",
  TIDAK_LANCAR: "destructive",
  BUTUH_BIMBINGAN: "warning",
}
const STATUS_LABEL: Record<string, string> = {
  LANCAR: "Lancar",
  KURANG_LANCAR: "Kurang Lancar",
  TIDAK_LANCAR: "Tidak Lancar",
  BUTUH_BIMBINGAN: "Butuh Bimbingan",
}
const ATT_COLORS = ["#376b59", "#b58b4b", "#b85b4b", "#768078"]

export default function OrangTuaDashboard() {
  const { user, profile } = useAuth();
  const [santri, setSantri] = useState<{ id: string; nama: string; kelompok?: { nama: string; sesi?: { nama: string } | null; pengajar?: { nama: string } | null } | null } | null>(null);
  const [presensis, setPresensis] = useState<PresensiRow[]>([]);
  const [cicilans, setCicilans] = useState<CicilanRow[]>([]);
  const [doas, setDoas] = useState<DoaRow[]>([]);
  const [bacaans, setBacaans] = useState<BacaanRow[]>([]);
  const [praktiks, setPraktiks] = useState<PraktikRow[]>([]);
  const [komponens, setKomponens] = useState<KomponenRow[]>([]);
  const [totalDoaMaster, setTotalDoaMaster] = useState(0);
  const [jenisSalats, setJenisSalats] = useState<string[]>([]);
  const [period, setPeriod] = useState("month");
  const supabase = createClient();

  const periodStart = useMemo(() => {
    const now = new Date();
    const d = new Date();
    if (period === "week") d.setDate(now.getDate() - 7);
    else if (period === "month") d.setMonth(now.getMonth() - 1);
    else if (period === "quarter") d.setMonth(now.getMonth() - 3);
    else if (period === "year") d.setFullYear(now.getFullYear() - 1);
    return isoDate(d);
  }, [period]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: s } = await supabase
        .from("santri")
        .select("id, nama, kelompok(nama, sesi(nama), pengajar(nama))")
        .eq("profile_id", user.id)
        .single();
      if (!s) return;
      const sd = s as unknown as { id: string; nama: string; kelompok?: { nama: string; sesi?: { nama: string } | null; pengajar?: { nama: string } | null } | null };
      setSantri(sd);

      const [pr, ci, doa, ba, pk, ko, doaM, js] = await Promise.all([
        supabase.from("presensi").select("id, status, tanggal").eq("santri_id", sd.id),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(surat(nama, jumlah_ayat))").eq("hafalan_santri.santri_id", sd.id),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, status, catatan, doa(nama)").eq("santri_id", sd.id),
        supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, status, catatan, surat(nama)").eq("santri_id", sd.id),
        supabase.from("praktik_salat").select("id, tanggal, status, catatan, jenis_salat(nama)").eq("santri_id", sd.id),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, status, catatan, komponen_salat(nama)").eq("santri_id", sd.id),
        supabase.from("doa").select("id", { count: "exact", head: true }),
        supabase.from("jenis_salat").select("nama").eq("aktif", true),
      ]);
      setPresensis((pr.data ?? []) as unknown as PresensiRow[])
      setCicilans((ci.data ?? []) as unknown as CicilanRow[])
      setDoas((doa.data ?? []) as unknown as DoaRow[])
      setBacaans((ba.data ?? []) as unknown as BacaanRow[])
      setPraktiks((pk.data ?? []) as unknown as PraktikRow[])
      setKomponens((ko.data ?? []) as unknown as KomponenRow[])
      setTotalDoaMaster(doaM.count ?? 0)
      setJenisSalats((js.data ?? []).map((x) => x.nama))
    };
    fetchData();
  }, [user]);

  const inPeriod = (t: string) => t >= periodStart;

  // --- Presensi (default bulan berjalan) ---
  const presensiPeriod = presensis.filter((a) => inPeriod(a.tanggal));
  const hadir = presensiPeriod.filter((a) => a.status === "HADIR").length;
  const izin = presensiPeriod.filter((a) => a.status === "IZIN").length;
  const sakit = presensiPeriod.filter((a) => a.status === "SAKIT").length;
  const alpha = presensiPeriod.filter((a) => a.status === "ALPHA").length;
  const totalPres = presensiPeriod.length;
  const attendanceRate = totalPres > 0 ? Math.round((hadir / totalPres) * 100) : 0;
  const attData = [
    { name: "Hadir", value: hadir },
    { name: "Izin", value: izin },
    { name: "Sakit", value: sakit },
    { name: "Alpha", value: alpha },
  ].filter((d) => d.value > 0);

  // --- Bacaan terbaru ---
  const latestBacaan = [...bacaans].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))[0];
  const bacaanDetail = latestBacaan
    ? (latestBacaan.jenis_bacaan === "IQRA"
        ? `Iqra jilid ${latestBacaan.jilid} · Halaman ${latestBacaan.halaman}`
        : `${latestBacaan.surat?.nama ?? "-"} · Juz ${latestBacaan.juz ?? "-"}`)
    : null;

  // --- Hafalan surat (progress by ayat capaian maksimal) ---
  const bySurat = new Map<string, { nama: string; jumlah: number; max: number; lastStatus: string | null; lastTanggal: string; setoran: string | null }>();
  cicilans.forEach((c) => {
    const nama = c.hafalan_santri?.surat?.nama;
    const jumlah = c.hafalan_santri?.surat?.jumlah_ayat ?? 0;
    if (!nama) return;
    const cur = bySurat.get(nama) ?? { nama, jumlah, max: 0, lastStatus: null, lastTanggal: "", setoran: null };
    if (c.ayat_selesai && c.ayat_selesai > cur.max) cur.max = c.ayat_selesai;
    if (c.tanggal > cur.lastTanggal) {
      cur.lastTanggal = c.tanggal;
      cur.lastStatus = c.status;
      cur.setoran = `${c.ayat_mulai}-${c.ayat_selesai}`;
    }
    bySurat.set(nama, cur);
  });
  const suratGroups = [...bySurat.values()];
  const suratLulus = suratGroups.filter((g) => g.jumlah > 0 && g.max >= g.jumlah).length;
  const latestSurat = [...suratGroups].sort((a, b) => (a.lastTanggal < b.lastTanggal ? 1 : -1))[0];

  // --- Hafalan doa ---
  const doaDihafal = new Set(doas.map((d) => d.doa?.nama).filter(Boolean)).size;
  const totalDoa = totalDoaMaster || 22;

  // --- Praktik salat (per jenis, dari praktik_salat saja) ---
  const praktikPerJenis = new Map<string, string>();
  praktiks.forEach((p) => {
    const nama = p.jenis_salat?.nama;
    if (nama && p.tanggal) {
      const prev = praktikPerJenis.get(nama);
      if (!prev) praktikPerJenis.set(nama, p.status ?? "");
    }
  });
  const salatStatus = jenisSalats.map((nama) => ({ nama, status: praktikPerJenis.get(nama) ?? null }));
  const salatLancar = salatStatus.filter((s) => s.status === "LANCAR").length;
  const salatBimbingan = salatStatus.filter((s) => s.status === "BUTUH_BIMBINGAN").length;
  const salatBelum = salatStatus.filter((s) => !s.status).length;

  // --- Perkembangan terbaru (gabungan 5 tabel) ---
  const recent: { id: string; tanggal: string; tipe: string; detail: string; status: string | null; catatan: string | null }[] = [];
  const push = (tipe: string, id: string, tanggal: string, detail: string, status: string | null, catatan: string | null) => recent.push({ id, tanggal, tipe, detail, status, catatan });
  bacaans.forEach((r) => push("Bacaan", r.id, r.tanggal, r.jenis_bacaan === "IQRA" ? `Iqra ${r.jilid} · Hal. ${r.halaman}` : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`, r.status, r.catatan));
  cicilans.forEach((r) => { const nama = r.hafalan_santri?.surat?.nama; if (!nama) return; push("Hafalan Surat", r.id, r.tanggal, `${nama} · ayat ${r.ayat_mulai}-${r.ayat_selesai}`, r.status, r.catatan); });
  doas.forEach((r) => { if (!r.doa?.nama) return; push("Hafalan Doa", r.id, r.tanggal, r.doa.nama, r.status, r.catatan); });
  komponens.forEach((r) => { if (!r.komponen_salat?.nama) return; push("Salat Komponen", r.id, r.tanggal, r.komponen_salat.nama, r.status, r.catatan); });
  praktiks.forEach((r) => { if (!r.jenis_salat?.nama) return; push("Praktik Salat", r.id, r.tanggal, r.jenis_salat.nama, r.status, r.catatan); });
  const recentSorted = recent.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)).slice(0, 8);

  // --- Perlu perhatian (hanya pada periode terpilih) ---
  const attention = recent.filter((r) =>
    inPeriod(r.tanggal) && (
      (r.tipe.includes("Bacaan") || r.tipe.includes("Hafalan")) && (r.status === "KURANG_LANCAR" || r.status === "TIDAK_LANCAR") ||
      (r.tipe.includes("Salat") && r.status === "BUTUH_BIMBINGAN")
    )
  ).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portal orang tua"
        title={`Selamat Datang, ${profile?.nama ?? "Orang Tua"}`}
        description={santri ? `Berikut ringkasan perkembangan ${santri.nama}.` : "Ringkasan perkembangan anak Anda."}
        action={
          <div className="w-44">
            <Label className="text-[10px] text-muted-foreground">Periode</Label>
            <Select value={period} onValueChange={(v: string | null) => v && setPeriod(v)} items={[{ label: "Minggu Ini", value: "week" }, { label: "Bulan Ini", value: "month" }, { label: "3 Bulan", value: "quarter" }, { label: "Tahun Ini", value: "year" }]}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="quarter">3 Bulan</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <IslamicBanner text="Anak adalah amanah, didiklah mereka dengan pendidikan yang baik." source="Pesan bijak bagi orang tua" />

      {santri && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-700 via-primary to-teal-600 p-5 text-white">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/15" />
          <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full border border-white/10" />
          <div className="relative flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white/15 p-3 text-lg font-bold text-white">{santri.nama.charAt(0)}</div>
              <div>
                <p className="text-xs text-white/70">Nama</p>
                <p className="font-semibold text-white">{santri.nama}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/70">Kelompok</p>
              <p className="font-medium text-white">{santri.kelompok?.nama ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Sesi</p>
              <p className="font-medium text-white">{santri.kelompok?.sesi?.nama === "PAGI" ? "Pagi" : santri.kelompok?.sesi?.nama === "SORE" ? "Sore" : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Pengajar</p>
              <p className="font-medium text-white">{santri.kelompok?.pengajar?.nama ?? "-"}</p>
            </div>
          </div>
        </div>
      )}

      {/* CARD 1 — Presensi */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel min-w-0 overflow-hidden p-5 sm:p-6">
          <SectionHeader title="Presensi" description={`Periode: ${periodLabel(period)}`} />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatCard label="Hadir" value={hadir} icon={CalendarCheck} className="bg-gradient-to-br from-emerald-500 to-teal-700" />
            <StatCard label="Izin" value={izin} icon={CalendarX} className="bg-gradient-to-br from-amber-400 to-orange-600" />
            <StatCard label="Sakit" value={sakit} icon={Activity} className="bg-gradient-to-br from-orange-400 to-red-500" />
            <StatCard label="Alpha" value={alpha} icon={UserX} className="bg-gradient-to-br from-rose-500 to-red-600" />
            <StatCard label="Persentase" value={`${attendanceRate}%`} icon={TrendingUp} className="bg-gradient-to-br from-sky-500 to-blue-700" />
          </div>
          <div className="mt-4 h-[160px] w-full min-w-0">
            {totalPres > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart><Pie data={attData} cx="50%" cy="50%" innerRadius="40%" outerRadius="60%" paddingAngle={3} dataKey="value" stroke="none" label={({ name, value }) => `${name} ${value}`} labelLine={false} style={{ fontSize: 10, fontWeight: 600, fill: "#26352e" }}>{attData.map((e, i) => <Cell key={e.name} style={{ fill: ATT_COLORS[i] }} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Belum ada presensi pada periode ini</div>}
          </div>
        </section>

        {/* CARD 2 — Bacaan */}
        <section className="surface-panel min-w-0 p-5 sm:p-6">
          <SectionHeader title="Bacaan" description="Perkembangan bacaan terbaru" />
          <div className="mt-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-primary"><BookOpen className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Terbaru</span></div>
            {bacaanDetail ? (
              <>
                <p className="mt-2 text-xl font-semibold text-foreground">{bacaanDetail}</p>
                <div className="mt-2 flex items-center gap-2">
                  {latestBacaan?.status && <Badge variant={STATUS_BADGE[latestBacaan.status] ?? "secondary"}>{STATUS_LABEL[latestBacaan.status] ?? latestBacaan.status}</Badge>}
                  <span className="text-xs text-muted-foreground">{latestBacaan ? formatDateShort(latestBacaan.tanggal) : ""}</span>
                </div>
                {latestBacaan?.catatan && <p className="mt-2 text-sm italic text-muted-foreground">&quot;{latestBacaan.catatan}&quot;</p>}
              </>
            ) : <p className="mt-2 text-sm text-muted-foreground">Belum ada catatan bacaan</p>}
          </div>
        </section>

        {/* CARD 3 — Hafalan Surat */}
        <section className="surface-panel min-w-0 p-5 sm:p-6">
          <SectionHeader title="Hafalan Surat" description="Capaian hafalan surat" />
          <div className="mt-4 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Surat lulus dihafal</p>
              <strong className="font-mono text-xl text-primary">{suratLulus} / {TARGET_SURAT} surat</strong>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(suratLulus / TARGET_SURAT) * 100}%` }} />
            </div>
            {latestSurat && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{latestSurat.nama}</p>
                  <span className="text-xs text-muted-foreground">{formatDateShort(latestSurat.lastTanggal)}</span>
                </div>
                <div className="mt-1 flex items-end justify-between">
                  <span className="font-mono text-lg text-foreground">{latestSurat.max} / {latestSurat.jumlah} ayat</span>
                  <span className="text-xs text-muted-foreground">{latestSurat.jumlah ? Math.round((latestSurat.max / latestSurat.jumlah) * 100) : 0}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${latestSurat.jumlah ? Math.min(100, (latestSurat.max / latestSurat.jumlah) * 100) : 0}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {latestSurat.lastStatus && <Badge variant={STATUS_BADGE[latestSurat.lastStatus] ?? "secondary"}>{STATUS_LABEL[latestSurat.lastStatus] ?? latestSurat.lastStatus}</Badge>}
                  <span>Setoran terakhir: ayat {latestSurat.setoran}</span>
                </div>
              </div>
            )}
            {suratGroups.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Belum ada hafalan surat</p>}
          </div>
        </section>

        {/* CARD 4 — Hafalan Doa */}
        <section className="surface-panel min-w-0 p-5 sm:p-6">
          <SectionHeader title="Hafalan Doa" description="Capaian hafalan doa harian" />
          <div className="mt-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-purple-600"><BookHeart className="h-4 w-4" /></div>
            <div className="mt-2 flex items-end justify-between">
              <span className="font-mono text-2xl text-foreground">{doaDihafal} / {totalDoa} doa</span>
              <span className="text-xs text-muted-foreground">{totalDoa ? Math.round((doaDihafal / totalDoa) * 100) : 0}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-purple-500" style={{ width: `${totalDoa ? Math.min(100, (doaDihafal / totalDoa) * 100) : 0}%` }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Jumlah doa yang sudah dihafal dari total doa harian yang diajarkan.</p>
          </div>
        </section>

        {/* CARD 5 — Praktik Salat */}
        <section className="surface-panel min-w-0 p-5 sm:p-6 lg:col-span-2">
          <SectionHeader title="Praktik Salat" description="Hasil praktik keseluruhan per salat" />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {salatStatus.map((s) => (
              <div key={s.nama} className="rounded-lg border border-border p-3 text-center">
                <p className="font-medium text-foreground">{s.nama}</p>
                <p className="mt-1 text-sm">
                  {s.status === "LANCAR" ? <span className="text-green-600">Lancar</span>
                    : s.status === "BUTUH_BIMBINGAN" ? <span className="text-amber-600">Butuh Bimbingan</span>
                    : <span className="text-muted-foreground">Belum Dinilai</span>}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span><span className="inline-block h-2 w-2 rounded-full bg-green-600 mr-1" />Lancar: {salatLancar}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1" />Butuh Bimbingan: {salatBimbingan}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 mr-1" />Belum Dinilai: {salatBelum}</span>
          </div>
        </section>
      </div>

      {/* Perlu perhatian */}
      <section className="surface-panel min-w-0 p-5 sm:p-6">
        <SectionHeader title="Perlu Perhatian" description="Penilaian yang membutuhkan tindak lanjut" />
        {attention.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Tidak ada item yang perlu perhatian</div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {attention.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-amber-100 p-1.5 text-amber-700"><AlertTriangle className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium text-foreground">{a.tipe}</p>
                    <p className="text-sm text-muted-foreground">{a.detail}</p>
                  </div>
                </div>
                <div className="text-right">
                  {a.status && <Badge variant={STATUS_BADGE[a.status] ?? "secondary"}>{STATUS_LABEL[a.status] ?? a.status}</Badge>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateShort(a.tanggal)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Perkembangan terbaru */}
      <section className="surface-panel min-w-0 p-5 sm:p-6">
        <SectionHeader title="Perkembangan Terbaru" description="Catatan perkembangan terkini" />
        {recentSorted.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" /> Belum ada perkembangan</div>
        ) : (
          <div className="mt-4 space-y-2">
            {recentSorted.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.tipe}</Badge>
                    {r.status && <Badge variant={STATUS_BADGE[r.status] ?? "secondary"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-foreground">{r.detail}</p>
                  {r.catatan && <p className="mt-1 text-sm italic text-muted-foreground">&quot;{r.catatan}&quot;</p>}
                </div>
                <div className="text-xs text-muted-foreground">{formatDateShort(r.tanggal)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function periodLabel(period: string): string {
  return ({ week: "Minggu ini", month: "Bulan ini", quarter: "3 Bulan", year: "Tahun ini" } as Record<string, string>)[period] ?? period
}