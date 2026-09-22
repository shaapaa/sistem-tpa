"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, BookOpen, BookHeart, CalendarCheck, CircleCheck, Moon, UserX } from "lucide-react";
import { formatDateShort, formatTingkat } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { CapaianBar } from "@/components/layout/capaian-bar";

const TARGET_SURAT = 38; // Juz 30 + Al-Fatihah

type PresensiRow = { id: string; status: string; tanggal: string }
type CicilanRow = { id: string; tanggal: string; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; hafalan_santri?: { surat?: { nama: string; jumlah_ayat: number } | null } | null }
type DoaRow = { id: string; tanggal: string; status: string | null; catatan: string | null; doa?: { nama: string } | null }
type BacaanRow = { id: string; tanggal: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null }
type PraktikRow = { id: string; tanggal: string; status: string | null; catatan: string | null; jenis_salat?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; status: string | null; catatan: string | null; komponen_salat?: { nama: string } | null }
type NiatSalatRow = { id: string; tanggal: string; status: string; catatan: string | null; jenis_salat?: { nama: string } | null }
type GerakanSalatRow = { id: string; tanggal: string; catatan: string | null }
type GerakanSalatKomponenRow = { id: string; status: string; komponen_salat?: { nama: string } | null; perkembangan_gerakan_salat?: { tanggal: string; catatan: string | null } | null }
type Santri = { id: string; nama: string; keterangan: string | null; kelompok?: { nama: string; sesi?: { nama: string } | null } | null }

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

export default function OrangTuaDashboard() {
  const { user, profile } = useAuth();
  const [santris, setSantris] = useState<Santri[]>([]);
  const [activeSantriId, setActiveSantriId] = useState<string | null>(null);
  const [presensis, setPresensis] = useState<PresensiRow[]>([]);
  const [cicilans, setCicilans] = useState<CicilanRow[]>([]);
  const [doas, setDoas] = useState<DoaRow[]>([]);
  const [bacaans, setBacaans] = useState<BacaanRow[]>([]);
  const [praktiks, setPraktiks] = useState<PraktikRow[]>([]);
  const [komponens, setKomponens] = useState<KomponenRow[]>([]);
  const [niatSalats, setNiatSalats] = useState<NiatSalatRow[]>([]);
  const [gerakanSalats, setGerakanSalats] = useState<GerakanSalatRow[]>([]);
  const [gerakanSalatKomponens, setGerakanSalatKomponens] = useState<GerakanSalatKomponenRow[]>([]);
  const [totalDoaMaster, setTotalDoaMaster] = useState(0);
  const [jenisSalats, setJenisSalats] = useState<string[]>([]);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const activeSantri = santris.find((santri) => santri.id === activeSantriId) ?? null;

  const periodStart = useMemo(() => {
    const now = new Date();
    const d = new Date();
    if (period === "week") d.setDate(now.getDate() - 7);
    else if (period === "month") { d.setDate(1); d.setMonth(now.getMonth(), 1); }
    else if (period === "quarter") { d.setMonth(now.getMonth() - 3); d.setDate(1); }
    else if (period === "year") { d.setMonth(0); d.setDate(1); }
    return isoDate(d);
  }, [period]);

  useEffect(() => {
    const fetchSantris = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("santri")
        .select("id, nama, keterangan, kelompok(nama, sesi(nama))")
        .order("nama");
      if (error) {
        setError("Data anak tidak dapat dimuat. Silakan coba lagi.");
        setSantris([]);
        setActiveSantriId(null);
      } else {
        const nextSantris = (data ?? []) as unknown as Santri[];
        setSantris(nextSantris);
        setActiveSantriId((currentId) => nextSantris.some((santri) => santri.id === currentId) ? currentId : nextSantris[0]?.id ?? null);
      }
      setLoading(false);
    };
    fetchSantris();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const fetchDashboardData = async () => {
      if (!activeSantriId) {
        setPresensis([]);
        setCicilans([]);
        setDoas([]);
        setBacaans([]);
        setPraktiks([]);
        setKomponens([]);
        setNiatSalats([]);
        setGerakanSalats([]);
        setGerakanSalatKomponens([]);
        setTotalDoaMaster(0);
        setJenisSalats([]);
        return;
      }
      setLoading(true);
      setError(null);
      setPresensis([]);
      setCicilans([]);
      setDoas([]);
      setBacaans([]);
      setPraktiks([]);
      setKomponens([]);
      setNiatSalats([]);
      setGerakanSalats([]);
      setGerakanSalatKomponens([]);
      const [pr, ci, doa, ba, pk, ko, niat, gerakan, gerakanKomponen, doaM, js] = await Promise.all([
        supabase.from("presensi").select("id, status, tanggal").eq("santri_id", activeSantriId),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(surat(nama, jumlah_ayat))").eq("hafalan_santri.santri_id", activeSantriId),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, status, catatan, doa(nama)").eq("santri_id", activeSantriId),
        supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, status, catatan, surat(nama)").eq("santri_id", activeSantriId),
        supabase.from("praktik_salat").select("id, tanggal, status, catatan, jenis_salat(nama)").eq("santri_id", activeSantriId),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, status, catatan, komponen_salat(nama)").eq("santri_id", activeSantriId),
        supabase.from("perkembangan_niat_salat").select("id, tanggal, status, catatan, jenis_salat(nama)").eq("santri_id", activeSantriId).order("tanggal", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("perkembangan_gerakan_salat").select("id, tanggal, catatan").eq("santri_id", activeSantriId).order("tanggal", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("perkembangan_gerakan_salat_komponen").select("id, status, komponen_salat(nama), perkembangan_gerakan_salat!inner(tanggal, catatan, santri_id)").eq("perkembangan_gerakan_salat.santri_id", activeSantriId),
        supabase.from("doa").select("id", { count: "exact", head: true }),
        supabase.from("jenis_salat").select("nama").eq("aktif", true),
      ]);
      if (cancelled) return;
      const dashboardError = [pr, ci, doa, ba, pk, ko, niat, gerakan, gerakanKomponen, doaM, js].find((result) => result.error)?.error;
      if (dashboardError) {
        setError("Data dashboard tidak dapat dimuat. Silakan coba lagi.");
        setLoading(false);
        return;
      }
      setPresensis((pr.data ?? []) as unknown as PresensiRow[])
      setCicilans((ci.data ?? []) as unknown as CicilanRow[])
      setDoas((doa.data ?? []) as unknown as DoaRow[])
      setBacaans((ba.data ?? []) as unknown as BacaanRow[])
      setPraktiks((pk.data ?? []) as unknown as PraktikRow[])
      setKomponens((ko.data ?? []) as unknown as KomponenRow[])
      setNiatSalats((niat.data ?? []) as unknown as NiatSalatRow[])
      setGerakanSalats((gerakan.data ?? []) as unknown as GerakanSalatRow[])
      setGerakanSalatKomponens((gerakanKomponen.data ?? []) as unknown as GerakanSalatKomponenRow[])
      setTotalDoaMaster(doaM.count ?? 0)
      setJenisSalats((js.data ?? []).map((x) => x.nama))
      setLoading(false);
    };
    fetchDashboardData();
    return () => { cancelled = true; };
  }, [activeSantriId]);

  const inPeriod = (t: string) => t >= periodStart;

  // --- Presensi (default bulan berjalan) ---
  const presensiPeriod = presensis.filter((a) => inPeriod(a.tanggal));
  const hadir = presensiPeriod.filter((a) => a.status === "HADIR").length;
  const totalPres = presensiPeriod.length;
  const attendanceRate = totalPres > 0 ? Math.round((hadir / totalPres) * 100) : 0;

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


  // --- Hafalan doa ---
  const doaDihafal = new Set(doas.map((d) => d.doa?.nama).filter(Boolean)).size;
  const totalDoa = totalDoaMaster || 22;

  // Niat Salat model baru menjadi sumber utama; data legacy tetap dipakai sebagai riwayat lama.
  const praktikPerJenis = new Map<string, string>();
  niatSalats.forEach((niat) => {
    const nama = niat.jenis_salat?.nama;
    if (nama && niat.tanggal && !praktikPerJenis.has(nama)) praktikPerJenis.set(nama, niat.status);
  });
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

  // --- Perkembangan terbaru (gabungan 5 tabel) ---
  const recent: { id: string; tanggal: string; tipe: string; detail: string; status: string | null; catatan: string | null }[] = [];
  const push = (tipe: string, id: string, tanggal: string, detail: string, status: string | null, catatan: string | null) => recent.push({ id, tanggal, tipe, detail, status, catatan });
  bacaans.forEach((r) => push("Bacaan", r.id, r.tanggal, r.jenis_bacaan === "IQRA" ? `Iqra ${r.jilid} · Hal. ${r.halaman}` : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`, r.status, r.catatan));
  cicilans.forEach((r) => { const nama = r.hafalan_santri?.surat?.nama; if (!nama) return; push("Hafalan Surat", r.id, r.tanggal, `${nama} · ayat ${r.ayat_mulai}-${r.ayat_selesai}`, r.status, r.catatan); });
  doas.forEach((r) => { if (!r.doa?.nama) return; push("Hafalan Doa", r.id, r.tanggal, r.doa.nama, r.status, r.catatan); });
  gerakanSalats.forEach((r) => push("Gerakan Salat", r.id, r.tanggal, "Penilaian delapan komponen", null, r.catatan));
  niatSalats.forEach((r) => { if (!r.jenis_salat?.nama) return; push("Niat Salat", r.id, r.tanggal, r.jenis_salat.nama, r.status, r.catatan); });
  komponens.forEach((r) => { if (!r.komponen_salat?.nama) return; push("Salat Komponen", r.id, r.tanggal, r.komponen_salat.nama, r.status, r.catatan); });
  praktiks.forEach((r) => { if (!r.jenis_salat?.nama) return; push("Praktik Salat", r.id, r.tanggal, r.jenis_salat.nama, r.status, r.catatan); });
  const recentSorted = recent.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)).slice(0, 8);

  // --- Perlu perhatian (hanya pada periode terpilih) ---
  const attention = [
    ...recent.filter((r) =>
      inPeriod(r.tanggal) && (
      (r.tipe.includes("Bacaan") || r.tipe.includes("Hafalan")) && (r.status === "KURANG_LANCAR" || r.status === "TIDAK_LANCAR") ||
      (r.tipe.includes("Salat") && r.status === "BUTUH_BIMBINGAN")
      )
    ),
    ...gerakanSalatKomponens
      .filter((komponen) => komponen.status === "BUTUH_BIMBINGAN" && Boolean(komponen.perkembangan_gerakan_salat?.tanggal) && inPeriod(komponen.perkembangan_gerakan_salat!.tanggal))
      .map((komponen) => ({
        id: komponen.id,
        tanggal: komponen.perkembangan_gerakan_salat!.tanggal,
        tipe: "Gerakan Salat",
        detail: komponen.komponen_salat?.nama ?? "Komponen gerakan",
        status: komponen.status,
        catatan: komponen.perkembangan_gerakan_salat?.catatan ?? null,
      })),
  ].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)).slice(0, 6);

  if (loading) return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  if (error) return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center sm:p-12">
      <UserX className="mx-auto mb-3 h-10 w-10 text-destructive/60" />
      <p className="text-sm text-destructive">{error}</p>
    </div>
  );
  if (santris.length === 0 || !activeSantri) return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
      <UserX className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">Data anak belum tersedia.</p>
    </div>
  );

  const latestUpdate = recentSorted[0]?.tanggal;
  const bacaanSummary = bacaanDetail ?? "Belum ada catatan";
  const bacaanStatus = latestBacaan?.status ? STATUS_LABEL[latestBacaan.status] ?? latestBacaan.status : "Menunggu penilaian";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Halo, ${profile?.nama ?? "Orang Tua"}`}
        title={`Perkembangan ${activeSantri.nama}`}
        description={`Ringkasan perkembangan ${activeSantri.nama} yang Anda pantau.`}
        action={
          <div className="flex flex-wrap gap-3">
            {santris.length > 1 && (
              <div className="w-44">
                <Label className="text-[10px] text-muted-foreground">Pilih Anak</Label>
                <Select value={activeSantriId} onValueChange={(value: string | null) => value && setActiveSantriId(value)} items={santris.map((santri) => ({ label: santri.nama, value: santri.id }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {santris.map((santri) => <SelectItem key={santri.id} value={santri.id}>{santri.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
          </div>
        }
      />

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-primary to-teal-700 p-5 text-white sm:p-6">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/15" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-xl font-bold">{activeSantri.nama.charAt(0)}</div><div><p className="text-sm text-white/75">Perkembangan</p><h2 className="text-xl font-semibold">{activeSantri.nama}</h2><p className="mt-1 text-sm text-white/80">Kelompok {activeSantri.kelompok?.nama ?? "-"}{activeSantri.keterangan ? ` · ${formatTingkat(activeSantri.keterangan)}` : ""} · Sesi {activeSantri.kelompok?.sesi?.nama === "PAGI" ? "Pagi" : activeSantri.kelompok?.sesi?.nama === "SORE" ? "Sore" : "-"}</p></div></div>
          <p className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/85">{latestUpdate ? `Terakhir diperbarui ${formatDateShort(latestUpdate)}` : "Belum ada pembaruan perkembangan"}</p>
        </div>
      </section>

      <section><SectionHeader title="Ringkasan utama" description={`Kondisi ${activeSantri.nama} pada ${periodLabel(period).toLowerCase()}.`} /><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/orang-tua/presensi" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"><CalendarCheck className="h-4 w-4 text-emerald-600" /><p className="mt-3 text-2xl font-semibold">{attendanceRate}%</p><p className="text-sm font-medium">Kehadiran</p><p className="mt-1 text-xs text-muted-foreground">{hadir} dari {totalPres} pertemuan</p></Link>
        <Link href="/orang-tua/perkembangan" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"><BookOpen className="h-4 w-4 text-amber-600" /><p className="mt-3 truncate text-sm font-semibold">{bacaanSummary}</p><p className="mt-1 text-sm font-medium">Bacaan</p><p className="mt-1 text-xs text-muted-foreground">{bacaanStatus}</p></Link>
        <Link href="/orang-tua/perkembangan" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"><BookHeart className="h-4 w-4 text-violet-600" /><p className="mt-3 text-2xl font-semibold">{suratLulus}</p><p className="text-sm font-medium">Surat tuntas</p><p className="mt-1 text-xs text-muted-foreground">dari {TARGET_SURAT} target surat</p></Link>
        <Link href="/orang-tua/perkembangan" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"><Moon className="h-4 w-4 text-sky-600" /><p className="mt-3 text-2xl font-semibold">{salatLancar}/{salatStatus.length}</p><p className="text-sm font-medium">Niat salat lancar</p><p className="mt-1 text-xs text-muted-foreground">{salatBimbingan ? `${salatBimbingan} perlu bimbingan` : "Tidak ada yang perlu dibimbing"}</p></Link>
      </div></section>

      <section className="surface-panel p-5 sm:p-6"><SectionHeader title="Capaian perkembangan" description="Ringkasan capaian yang dapat diukur dari catatan yang tersedia." /><div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CapaianBar label="Hafalan surat" value={`${suratLulus} dari ${TARGET_SURAT} surat tuntas`} pct={Math.round((suratLulus / TARGET_SURAT) * 100)} color="bg-indigo-500" />
        <CapaianBar label="Hafalan doa" value={`${doaDihafal} dari ${totalDoa} doa`} pct={totalDoa ? Math.round((doaDihafal / totalDoa) * 100) : 0} color="bg-violet-500" />
        <CapaianBar label="Niat salat" value={`${salatLancar} dari ${salatStatus.length} dinilai lancar`} pct={salatStatus.length ? Math.round((salatLancar / salatStatus.length) * 100) : 0} color="bg-sky-500" />
      </div></section>

      <section className="surface-panel p-5 sm:p-6"><SectionHeader title="Perkembangan terbaru" description="Catatan terbaru dari proses belajar anak." actions={<Link href="/orang-tua/perkembangan" className="action-link inline-flex items-center gap-1 text-sm">Lihat semua <ArrowRight className="h-3.5 w-3.5" /></Link>} />
        {recentSorted.length === 0 ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" /> Belum ada perkembangan yang dicatat.</div> : <div className="mt-4 space-y-3">{recentSorted.slice(0, 5).map((r) => <div key={r.id} className="flex gap-3"><div className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-card" /><div className="min-w-0 flex-1 border-b border-border/70 pb-3 last:border-0"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{r.tipe}</Badge>{r.status && <Badge variant={STATUS_BADGE[r.status] ?? "secondary"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>}</div><time className="text-xs text-muted-foreground">{formatDateShort(r.tanggal)}</time></div><p className="mt-2 text-sm font-medium text-foreground">{r.detail}</p>{r.catatan && <p className="mt-1 text-sm italic text-muted-foreground">&quot;{r.catatan}&quot;</p>}</div></div>)}</div>}
      </section>

      <section className="surface-panel p-5 sm:p-6"><SectionHeader title="Hal yang perlu diperhatikan" description="Penilaian yang membutuhkan tindak lanjut." />
        {attention.length === 0 ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CircleCheck className="h-4 w-4" /> Belum ada hal yang perlu diperhatikan.</div> : <div className="mt-4 grid gap-2 sm:grid-cols-2">{attention.map((a) => <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><p className="font-medium text-foreground">{a.tipe}</p><p className="text-sm text-muted-foreground">{a.detail}</p></div></div><div className="shrink-0 text-right">{a.status && <Badge variant={STATUS_BADGE[a.status] ?? "secondary"}>{STATUS_LABEL[a.status] ?? a.status}</Badge>}<p className="mt-1 text-xs text-muted-foreground">{formatDateShort(a.tanggal)}</p></div></div>)}</div>}
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
