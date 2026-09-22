"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, CalendarDays, BookMarked, Moon, CalendarCheck, Activity, CalendarX, UserX, TrendingUp } from "lucide-react";
import { formatDate, formatDateShort, formatStatus, getStatusBadgeVariant } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { todayJakarta } from "@/lib/islamic-date";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/layout/stat-card";
import { EmptyState } from "@/components/layout/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
import { createReportPdf } from "@/lib/report-pdf";
import { CapaianBar } from "@/components/layout/capaian-bar";

const TARGET_SURAT = 38;

type SantriInfo = { id: string; nama: string; keterangan: string | null; kelompok?: { nama: string; sesi?: { nama: string } | null } | null }
type PresensiRow = { id: string; tanggal: string; status: string; keterangan: string | null }
type BacaanRow = { id: string; tanggal: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null; pengajar?: { nama: string } | null }
type CicilanRow = { id: string; tanggal: string; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; hafalan_santri?: { santri_id: string; surat_id: string; surat?: { nama: string; jumlah_ayat: number; nomor: number } | null } | null; pengajar?: { nama: string } | null }
type DoaRow = { id: string; tanggal: string; status: string | null; catatan: string | null; doa?: { nama: string } | null; pengajar?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; status: string | null; catatan: string | null; komponen_salat_id: string; komponen_salat?: { nama: string } | null; pengajar?: { nama: string } | null }
type PraktikRow = { id: string; tanggal: string; status: string | null; catatan: string | null; jenis_salat_id: string; jenis_salat?: { nama: string } | null; pengajar?: { nama: string } | null }
type GerakanSalatRow = { id: string; tanggal: string; catatan: string | null; pengajar?: { nama: string } | null }
type GerakanSalatKomponenRow = { id: string; perkembangan_gerakan_salat_id: string; status: string; komponen_salat?: { nama: string } | null }
type NiatSalatRow = { id: string; tanggal: string; status: string; catatan: string | null; jenis_salat?: { nama: string } | null; pengajar?: { nama: string } | null }

const BAC_STATUS: Record<string, string> = { LANCAR: "Lancar", KURANG_LANCAR: "Kurang Lancar", TIDAK_LANCAR: "Tidak Lancar" }
const SALAT_STATUS: Record<string, string> = { LANCAR: "Lancar", BUTUH_BIMBINGAN: "Butuh Bimbingan" }
const BAC_BADGE: Record<string, "success" | "warning" | "destructive"> = { LANCAR: "success", KURANG_LANCAR: "warning", TIDAK_LANCAR: "destructive" }
const SALAT_BADGE: Record<string, "success" | "warning"> = { LANCAR: "success", BUTUH_BIMBINGAN: "warning" }
const progressionOrder = (nomor: number) => (nomor === 1 ? -1 : 114 - nomor)

function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
function firstOfMonth(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01` }

export default function OrangTuaLaporanPage() {
  const { user } = useAuth();
  const [santris, setSantris] = useState<SantriInfo[]>([]);
  const [activeSantriId, setActiveSantriId] = useState<string | null>(null);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<"SEMUA" | "BACAAN" | "HAFALAN" | "SALAT" | "KEHADIRAN">("SEMUA");
  const [dateFrom, setDateFrom] = useState(() => firstOfMonth(new Date()));
  const [dateTo, setDateTo] = useState(() => isoDate(new Date()));
  const [presensis, setPresensis] = useState<PresensiRow[]>([]);
  const [bacaans, setBacaans] = useState<BacaanRow[]>([]);
  const [cicilans, setCicilans] = useState<CicilanRow[]>([]);
  const [doas, setDoas] = useState<DoaRow[]>([]);
  const [komponenRows, setKomponenRows] = useState<KomponenRow[]>([]);
  const [praktiks, setPraktiks] = useState<PraktikRow[]>([]);
  const [gerakanSalats, setGerakanSalats] = useState<GerakanSalatRow[]>([]);
  const [gerakanSalatKomponens, setGerakanSalatKomponens] = useState<GerakanSalatKomponenRow[]>([]);
  const [niatSalats, setNiatSalats] = useState<NiatSalatRow[]>([]);
  // Riwayat mengikuti periode; data cumulative adalah snapshot capaian sampai tanggal akhir periode.
  const [cumulativeBacaans, setCumulativeBacaans] = useState<BacaanRow[]>([]);
  const [cumulativeCicilans, setCumulativeCicilans] = useState<CicilanRow[]>([]);
  const [cumulativeDoas, setCumulativeDoas] = useState<DoaRow[]>([]);
  const [cumulativeKomponenRows, setCumulativeKomponenRows] = useState<KomponenRow[]>([]);
  const [cumulativePraktiks, setCumulativePraktiks] = useState<PraktikRow[]>([]);
  const [cumulativeNiatSalats, setCumulativeNiatSalats] = useState<NiatSalatRow[]>([]);
  const [komponens, setKomponens] = useState<{ id: string; nama: string }[]>([]);
  const [jenisSalats, setJenisSalats] = useState<{ id: string; nama: string }[]>([]);
  const [totalDoa, setTotalDoa] = useState(0);
  const supabase = createClient();
  const activeSantri = santris.find((santri) => santri.id === activeSantriId) ?? null;
  const dateInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  useEffect(() => {
    const loadSantris = async () => {
      if (!user) return;
      setChildrenLoading(true);
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
        const nextSantris = (data ?? []) as unknown as SantriInfo[];
        setSantris(nextSantris);
        setActiveSantriId((currentId) => nextSantris.some((santri) => santri.id === currentId) ? currentId : nextSantris[0]?.id ?? null);
      }
      setChildrenLoading(false);
    };
    loadSantris();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!activeSantriId) {
        setPresensis([]);
        setBacaans([]);
        setCicilans([]);
        setDoas([]);
        setKomponenRows([]);
        setPraktiks([]);
        setGerakanSalats([]);
        setGerakanSalatKomponens([]);
        setNiatSalats([]);
        setCumulativeBacaans([]);
        setCumulativeCicilans([]);
        setCumulativeDoas([]);
        setCumulativeKomponenRows([]);
        setCumulativePraktiks([]);
        setCumulativeNiatSalats([]);
        return;
      }
      if (dateInvalid) {
        setReportLoading(false);
        return;
      }
      setReportLoading(true);
      setError(null);
      const start = `${dateFrom}T00:00:00`;
      const end = `${dateTo}T23:59:59`;
      const [pr, ba, ci, doa, ko, pk, ge, ni, komM, js, doaCount, cumBa, cumCi, cumDoa, cumKo, cumPk, cumNi] = await Promise.all([
        supabase.from("presensi").select("id, tanggal, status, keterangan").eq("santri_id", activeSantriId).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, ayat_mulai, ayat_selesai, status, catatan, surat(nama), pengajar(nama)").eq("santri_id", activeSantriId).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, ayat_mulai, ayat_selesai, status, catatan, pengajar(nama), hafalan_santri!inner(santri_id, surat_id, surat(nama, jumlah_ayat, nomor))").eq("hafalan_santri.santri_id", activeSantriId).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, status, catatan, doa(nama), pengajar(nama)").eq("santri_id", activeSantriId).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, status, catatan, komponen_salat_id, komponen_salat(nama), pengajar(nama)").eq("santri_id", activeSantriId).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("praktik_salat").select("id, tanggal, status, catatan, jenis_salat_id, jenis_salat(nama), pengajar(nama)").eq("santri_id", activeSantriId).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_gerakan_salat").select("id, tanggal, catatan, pengajar(nama)").eq("santri_id", activeSantriId).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_niat_salat").select("id, tanggal, status, catatan, jenis_salat(nama), pengajar(nama)").eq("santri_id", activeSantriId).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("komponen_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("jenis_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("doa").select("id", { count: "exact", head: true }).eq("aktif", true),
        supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, ayat_mulai, ayat_selesai, status, catatan, surat(nama), pengajar(nama)").eq("santri_id", activeSantriId).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, ayat_mulai, ayat_selesai, status, catatan, pengajar(nama), hafalan_santri!inner(santri_id, surat_id, surat(nama, jumlah_ayat, nomor))").eq("hafalan_santri.santri_id", activeSantriId).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, status, catatan, doa(nama), pengajar(nama)").eq("santri_id", activeSantriId).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, status, catatan, komponen_salat_id, komponen_salat(nama), pengajar(nama)").eq("santri_id", activeSantriId).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("praktik_salat").select("id, tanggal, status, catatan, jenis_salat_id, jenis_salat(nama), pengajar(nama)").eq("santri_id", activeSantriId).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_niat_salat").select("id, tanggal, status, catatan, jenis_salat(nama), pengajar(nama)").eq("santri_id", activeSantriId).lte("tanggal", end).order("tanggal", { ascending: false }),
      ]);
      if (cancelled) return;
      const gerakanIds = (ge.data ?? []).map((row) => row.id);
      const gerakanKomponen = gerakanIds.length > 0
        ? await supabase.from("perkembangan_gerakan_salat_komponen").select("id, perkembangan_gerakan_salat_id, status, komponen_salat(nama)").in("perkembangan_gerakan_salat_id", gerakanIds)
        : { data: [], error: null };
      if (cancelled) return;
      const laporanError = [pr, ba, ci, doa, ko, pk, ge, ni, komM, js, doaCount, cumBa, cumCi, cumDoa, cumKo, cumPk, cumNi, gerakanKomponen].find((result) => result.error)?.error;
      if (laporanError) {
        setError("Data laporan tidak dapat dimuat. Silakan coba lagi.");
        setReportLoading(false);
        return;
      }
      setPresensis((pr.data ?? []) as unknown as PresensiRow[]);
      setBacaans((ba.data ?? []) as unknown as BacaanRow[]);
      setCicilans((ci.data ?? []) as unknown as CicilanRow[]);
      setDoas((doa.data ?? []) as unknown as DoaRow[]);
      setKomponenRows((ko.data ?? []) as unknown as KomponenRow[]);
      setPraktiks((pk.data ?? []) as unknown as PraktikRow[]);
      setGerakanSalats((ge.data ?? []) as unknown as GerakanSalatRow[]);
      setGerakanSalatKomponens((gerakanKomponen.data ?? []) as unknown as GerakanSalatKomponenRow[]);
      setNiatSalats((ni.data ?? []) as unknown as NiatSalatRow[]);
      setCumulativeBacaans((cumBa.data ?? []) as unknown as BacaanRow[]);
      setCumulativeCicilans((cumCi.data ?? []) as unknown as CicilanRow[]);
      setCumulativeDoas((cumDoa.data ?? []) as unknown as DoaRow[]);
      setCumulativeKomponenRows((cumKo.data ?? []) as unknown as KomponenRow[]);
      setCumulativePraktiks((cumPk.data ?? []) as unknown as PraktikRow[]);
      setCumulativeNiatSalats((cumNi.data ?? []) as unknown as NiatSalatRow[]);
      setKomponens((komM.data ?? []) as { id: string; nama: string }[]);
      setJenisSalats((js.data ?? []) as { id: string; nama: string }[]);
      setTotalDoa(doaCount.count ?? 0);
      setReportLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [activeSantriId, dateFrom, dateTo, dateInvalid]);

  if (childrenLoading) return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  if (error && (santris.length === 0 || !activeSantri)) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Laporan santri" title="Laporan Perkembangan Santri" description="Rekap perkembangan anak Anda." backHref="/orang-tua" />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center sm:p-12">
          <UserX className="mx-auto mb-3 h-10 w-10 text-destructive/60" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }
  if (santris.length === 0 || !activeSantri) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Laporan santri" title="Laporan Perkembangan Santri" description="Rekap perkembangan anak Anda." backHref="/orang-tua" />
        <EmptyState message="Belum ada data anak yang terhubung dengan akun ini." />
      </div>
    );
  }

  const hadir = presensis.filter((r) => r.status === "HADIR").length;
  const sakit = presensis.filter((r) => r.status === "SAKIT").length;
  const izin = presensis.filter((r) => r.status === "IZIN").length;
  const alpa = presensis.filter((r) => r.status === "ALPHA").length;
  const totalPres = presensis.length;
  const rate = totalPres ? Math.round((hadir / totalPres) * 100) : 0;

  const bacaanDetail = (r: BacaanRow) => r.jenis_bacaan === "IQRA" ? `Iqra Jilid ${r.jilid} · Hal. ${r.halaman}` : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`;
  const bacaanLatest = cumulativeBacaans[0] ?? null;

  const bySurat = new Map<string, { suratId: string; nama: string; jumlah: number; nomor: number; max: number; latestStatus: string | null; latestTanggal: string; rows: CicilanRow[] }>();
  cumulativeCicilans.forEach((c) => {
    const hs = c.hafalan_santri;
    const surat = hs?.surat;
    if (!hs || !surat) return;
    const cur = bySurat.get(hs.surat_id) ?? { suratId: hs.surat_id, nama: surat.nama, jumlah: surat.jumlah_ayat, nomor: surat.nomor, max: 0, latestStatus: null, latestTanggal: "", rows: [] };
    cur.max = Math.max(cur.max, c.ayat_selesai ?? 0);
    cur.rows.push(c);
    bySurat.set(hs.surat_id, cur);
  });
  const suratDetail = [...bySurat.values()].map((x) => {
    const rows = [...x.rows].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
    return { ...x, rows, latestStatus: rows[0]?.status ?? null, latestTanggal: rows[0]?.tanggal ?? "", latestPengajar: rows[0]?.pengajar?.nama ?? "-" };
  }).sort((a, b) => progressionOrder(a.nomor) - progressionOrder(b.nomor));
  const suratTuntas = suratDetail.filter((s) => s.max >= s.jumlah).length;
  const suratSedang = suratDetail.filter((s) => s.max < s.jumlah).length;

  const doaMap = new Map<string, { nama: string; status: string | null; tanggal: string; pengajar: string; catatan: string | null }>();
  cumulativeDoas.forEach((d) => { if (!d.doa?.nama) return; if (!doaMap.has(d.doa.nama)) doaMap.set(d.doa.nama, { nama: d.doa.nama, status: d.status, tanggal: d.tanggal, pengajar: d.pengajar?.nama ?? "-", catatan: d.catatan }); });
  const doaList = [...doaMap.values()];
  const doaDihafal = doaList.length;
  const doaTotal = totalDoa;

  const komponenLatest = new Map<string, { status: string; tanggal: string; pengajar: string }>();
  cumulativeKomponenRows.forEach((r) => { if (!komponenLatest.has(r.komponen_salat_id)) komponenLatest.set(r.komponen_salat_id, { status: r.status ?? "", tanggal: r.tanggal, pengajar: r.pengajar?.nama ?? "-" }); });
  const praktikLatest = new Map<string, { status: string; tanggal: string; pengajar: string }>();
  cumulativePraktiks.forEach((r) => { if (!praktikLatest.has(r.jenis_salat_id)) praktikLatest.set(r.jenis_salat_id, { status: r.status ?? "", tanggal: r.tanggal, pengajar: r.pengajar?.nama ?? "-" }); });
  const niatLatest = new Map<string, { status: string; tanggal: string; pengajar: string }>();
  cumulativeNiatSalats.forEach((r) => {
    const nama = r.jenis_salat?.nama;
    if (nama && !niatLatest.has(nama)) niatLatest.set(nama, { status: r.status, tanggal: r.tanggal, pengajar: r.pengajar?.nama ?? "-" });
  });
  const salatLancar = [...niatLatest.values()].filter((s) => s.status === "LANCAR").length;
  const salatBimbingan = [...niatLatest.values()].filter((s) => s.status === "BUTUH_BIMBINGAN").length;

  const hafalanSuratPct = TARGET_SURAT ? Math.round((suratTuntas / TARGET_SURAT) * 100) : 0;
  const doaPct = doaTotal ? Math.round((doaDihafal / doaTotal) * 100) : 0;
  const salatPct = jenisSalats.length ? Math.round((salatLancar / jenisSalats.length) * 100) : 0;
  const jilidPct = bacaanLatest?.jenis_bacaan === "IQRA" && bacaanLatest.jilid ? Math.round((bacaanLatest.jilid / 6) * 100) : 0;
  const bacaanPosisi = bacaanLatest
    ? bacaanLatest.jenis_bacaan === "IQRA"
      ? `Iqra Jilid ${bacaanLatest.jilid} · Halaman ${bacaanLatest.halaman}`
      : `${bacaanLatest.surat?.nama ?? "-"} · Juz ${bacaanLatest.juz ?? "-"}`
    : "Belum ada catatan bacaan";

  const noPeriodData = presensis.length === 0 && bacaans.length === 0 && cicilans.length === 0 && doas.length === 0 && komponenRows.length === 0 && praktiks.length === 0 && gerakanSalats.length === 0 && niatSalats.length === 0;
  const noCumulativeData = cumulativeBacaans.length === 0 && cumulativeCicilans.length === 0 && cumulativeDoas.length === 0 && cumulativeKomponenRows.length === 0 && cumulativePraktiks.length === 0 && cumulativeNiatSalats.length === 0;
  const noData = noPeriodData && noCumulativeData;
  const periode = `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;
  const showBacaan = category === "SEMUA" || category === "BACAAN";
  const showHafalan = category === "SEMUA" || category === "HAFALAN";
  const showSalat = category === "SEMUA" || category === "SALAT";
  const showKehadiran = category === "SEMUA" || category === "KEHADIRAN";
  const selectedCategoryEmpty = category === "BACAAN" ? bacaans.length === 0
    : category === "HAFALAN" ? cicilans.length === 0 && doas.length === 0
      : category === "SALAT" ? gerakanSalats.length === 0 && niatSalats.length === 0 && komponenRows.length === 0 && praktiks.length === 0
        : category === "KEHADIRAN" ? presensis.length === 0 : false;

  const handleExportPDF = async () => {
    await createReportPdf({
      filename: `laporan-perkembangan-${activeSantri.nama.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${todayJakarta()}.pdf`,
      title: "Laporan Perkembangan Santri",
      metadata: [
        `Nama: ${activeSantri.nama}`,
        `Kelompok: ${activeSantri.kelompok?.nama ?? "-"}${activeSantri.keterangan ? ` — ${activeSantri.keterangan === "IQRA" ? "Iqra" : activeSantri.keterangan === "QURAN" ? "Al-Qur'an" : activeSantri.keterangan}` : ""}`,
        `Sesi: ${activeSantri.kelompok?.sesi?.nama ?? "-"}`,
        `Periode: ${periode}`,
        `Capaian kumulatif hingga: ${formatDate(dateTo)}`,
        `Dicetak: ${new Date().toLocaleDateString("id-ID")}`,
      ],
      tables: [
        { title: "Capaian Santri", head: ["Aspek", "Pencapaian"], body: [
          ["Kehadiran", `${hadir} dari ${totalPres} pertemuan (${rate}%)`],
          ["Bacaan", bacaanPosisi],
          ["Hafalan Surat", `${suratTuntas} dari ${TARGET_SURAT} surat tuntas (${hafalanSuratPct}%)`],
          ["Hafalan Doa", `${doaDihafal} dari ${doaTotal} doa (${doaPct}%)`],
          ["Niat Salat", `${salatLancar} dari ${jenisSalats.length} salat Lancar (${salatPct}%)`],
        ] },
        { title: "Perkembangan Bacaan", head: ["Tanggal", "Jenis", "Materi", "Status", "Pengajar Pencatat", "Catatan"], body: bacaans.map((r) => [formatDateShort(r.tanggal), r.jenis_bacaan === "IQRA" ? "Iqra" : "Al-Qur'an", bacaanDetail(r), BAC_STATUS[r.status ?? ""] ?? r.status ?? "-", r.pengajar?.nama ?? "-", r.catatan ?? "-"]) },
        { title: "Hafalan Surat", head: ["Surat", "Capaian", "Status Terakhir", "Pengajar Pencatat"], body: suratDetail.map((s) => [s.nama, `${s.max}/${s.jumlah} ayat · ${s.max >= s.jumlah ? "Tuntas" : "Sedang"}`, BAC_STATUS[s.latestStatus ?? ""] ?? s.latestStatus ?? "-", s.latestPengajar]) },
        { title: "Riwayat Cicilan Hafalan", head: ["Tanggal", "Surat", "Ayat", "Status", "Pengajar Pencatat", "Catatan"], body: cicilans.filter((c) => c.hafalan_santri?.surat).map((c) => [formatDateShort(c.tanggal), c.hafalan_santri?.surat?.nama ?? "-", `${c.ayat_mulai}-${c.ayat_selesai}`, BAC_STATUS[c.status ?? ""] ?? c.status ?? "-", c.pengajar?.nama ?? "-", c.catatan ?? "-"]) },
        { title: "Hafalan Doa", head: ["Doa", "Status", "Tanggal", "Pengajar Pencatat", "Catatan"], body: doaList.map((d) => [d.nama, BAC_STATUS[d.status ?? ""] ?? d.status ?? "-", formatDateShort(d.tanggal), d.pengajar, d.catatan ?? "-"]) },
        { title: "Praktik Salat — Gerakan", head: ["Tanggal", "Komponen Gerakan", "Status", "Catatan Sesi", "Pengajar Pencatat"], body: gerakanSalatKomponens.map((detail) => { const parent = gerakanSalats.find((gerakan) => gerakan.id === detail.perkembangan_gerakan_salat_id); return [parent ? formatDateShort(parent.tanggal) : "-", detail.komponen_salat?.nama ?? "-", SALAT_STATUS[detail.status] ?? detail.status, parent?.catatan ?? "-", parent?.pengajar?.nama ?? "-"]; }) },
        { title: "Praktik Salat — Niat", head: ["Tanggal", "Jenis Salat", "Status", "Catatan", "Pengajar Pencatat"], body: niatSalats.map((r) => [formatDateShort(r.tanggal), r.jenis_salat?.nama ?? "-", SALAT_STATUS[r.status] ?? r.status, r.catatan ?? "-", r.pengajar?.nama ?? "-"]) },
        ...(cumulativeKomponenRows.length > 0 ? [{ title: "Riwayat Praktik Salat Lama — Komponen", head: ["Komponen", "Status", "Tanggal", "Pengajar Pencatat"], body: komponens.map((k) => { const st = komponenLatest.get(k.id); return [k.nama, SALAT_STATUS[st?.status ?? ""] ?? "Belum Dinilai", st?.status ? formatDateShort(st.tanggal) : "-", st?.pengajar ?? "-"]; }) }] : []),
        ...(cumulativePraktiks.length > 0 ? [{ title: "Riwayat Praktik Salat Lama — Keseluruhan", head: ["Salat", "Status", "Tanggal", "Pengajar Pencatat"], body: jenisSalats.map((j) => { const st = praktikLatest.get(j.id); return [j.nama, SALAT_STATUS[st?.status ?? ""] ?? "Belum Dinilai", st?.status ? formatDateShort(st.tanggal) : "-", st?.pengajar ?? "-"]; }) }] : []),
        { title: "Riwayat Kehadiran", head: ["Tanggal", "Status", "Keterangan"], body: presensis.map((r) => [formatDateShort(r.tanggal), formatStatus(r.status), r.keterangan ?? "-"]) },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Laporan santri" title="Laporan Perkembangan Santri" description={`Perkembangan ${activeSantri.nama} pada periode terpilih.`} backHref="/orang-tua" action={<Button onClick={handleExportPDF} className="h-9 px-4" disabled={noData}><Download className="mr-2 h-4 w-4" /> Cetak PDF</Button>} />

      <div className="surface-panel p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {santris.length > 1 && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Pilih Anak</Label>
              <Select value={activeSantriId} onValueChange={(value: string | null) => value && setActiveSantriId(value)} items={santris.map((santri) => ({ label: santri.nama, value: santri.id }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {santris.map((santri) => <SelectItem key={santri.id} value={santri.id}>{santri.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tanggal mulai</Label>
            <DatePicker value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tanggal selesai</Label>
            <DatePicker value={dateTo} onChange={setDateTo} />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <Label className="text-[10px] text-muted-foreground">Tampilkan</Label>
            <Select value={category} onValueChange={(value) => { if (value === "SEMUA" || value === "BACAAN" || value === "HAFALAN" || value === "SALAT" || value === "KEHADIRAN") setCategory(value); }} items={[{ label: "Semua", value: "SEMUA" }, { label: "Bacaan", value: "BACAAN" }, { label: "Hafalan", value: "HAFALAN" }, { label: "Salat", value: "SALAT" }, { label: "Kehadiran", value: "KEHADIRAN" }]}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="SEMUA">Semua</SelectItem><SelectItem value="BACAAN">Bacaan</SelectItem><SelectItem value="HAFALAN">Hafalan</SelectItem><SelectItem value="SALAT">Salat</SelectItem><SelectItem value="KEHADIRAN">Kehadiran</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        {dateInvalid && <p className="mt-3 text-sm text-destructive">Tanggal mulai tidak boleh setelah tanggal akhir.</p>}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-700 via-primary to-teal-600 p-5 text-white">
            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/15" />
            <div className="relative flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/15 p-3 text-lg font-bold text-white">{activeSantri.nama.charAt(0)}</div>
                <div>
                  <p className="text-xs text-white/70">Nama Santri</p><p className="font-semibold text-white">{activeSantri.nama}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-white/70">Kelompok</p><p className="font-medium text-white">{activeSantri.kelompok?.nama ?? "-"}{activeSantri.keterangan ? ` — ${activeSantri.keterangan === "IQRA" ? "Iqra" : activeSantri.keterangan === "QURAN" ? "Al-Qur'an" : activeSantri.keterangan}` : ""}</p>
              </div>
              <div>
                <p className="text-xs text-white/70">Sesi</p><p className="font-medium text-white">{activeSantri.kelompok?.sesi?.nama === "PAGI" ? "Pagi" : activeSantri.kelompok?.sesi?.nama === "SORE" ? "Sore" : "-"}</p>
              </div>
              <div>
                <p className="text-xs text-white/70">Periode</p><p className="font-medium text-white">{formatDate(dateFrom)} – {formatDate(dateTo)}</p>
              </div>
            </div>
      </div>

      {dateInvalid ? null : reportLoading ? (
        <div className="space-y-3" aria-live="polite"><p className="text-sm text-muted-foreground">Memperbarui laporan…</p><div className="h-48 animate-pulse rounded-xl bg-muted" /></div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"><UserX className="mx-auto mb-3 h-10 w-10 text-destructive/60" /><p className="text-sm text-destructive">{error}</p></div>
      ) : noData ? (
        <EmptyState message="Belum ada catatan perkembangan untuk anak ini." hint="Catatan akan tampil setelah pengajar mencatat perkembangan anak." />
      ) : (
        <>

          {noPeriodData && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">Tidak ada aktivitas baru pada periode ini. Capaian anak tetap ditampilkan hingga tanggal akhir periode.</p>
          )}
          {selectedCategoryEmpty && <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Belum ada data {category.toLowerCase()} pada periode ini.</p>}

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard label="Kehadiran" value={`${hadir}/${totalPres}`} detail={`${rate}% kehadiran`} icon={CalendarDays} className="border-emerald-200 bg-emerald-50/80 text-emerald-900" />
            <StatCard label="Bacaan" value={BAC_STATUS[bacaanLatest?.status ?? ""] ?? "-"} detail={bacaanLatest ? bacaanDetail(bacaanLatest) : "belum ada catatan"} icon={FileText} className="border-amber-200 bg-amber-50/80 text-amber-900" />
            <StatCard label="Hafalan" value={`${suratTuntas} tuntas`} detail={`${suratSedang} sedang dihafal · ${TARGET_SURAT} target`} icon={BookMarked} className="border-violet-200 bg-violet-50/80 text-violet-900" />
            <StatCard label="Praktik Salat" value={`${salatLancar} Lancar`} detail={`${salatBimbingan} Butuh Bimbingan`} icon={Moon} className="border-sky-200 bg-sky-50/80 text-sky-900" />
          </div>
          <section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Capaian Santri" description={`Capaian hingga ${formatDate(dateTo)}; aktivitas mengikuti periode terpilih.`} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CapaianBar label="Kehadiran" value={`${hadir} dari ${totalPres} pertemuan`} pct={rate} color="bg-emerald-500" />
              <CapaianBar label="Bacaan" value={bacaanPosisi} pct={jilidPct} color="bg-amber-500" />
              <CapaianBar label="Hafalan Surat" value={`${suratTuntas} dari ${TARGET_SURAT} surat tuntas`} pct={hafalanSuratPct} color="bg-indigo-500" />
              <CapaianBar label="Hafalan Doa" value={`${doaDihafal} dari ${doaTotal} doa`} pct={doaPct} color="bg-violet-500" />
              <CapaianBar label="Praktik Salat" value={`${salatLancar} dari ${jenisSalats.length} salat Lancar`} pct={salatPct} color="bg-sky-500" />
            </div>
          </section>

          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">B. Detail perkembangan</p>
          </div>
          {showBacaan && (<section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Perkembangan Bacaan" description="Riwayat perkembangan bacaan pada periode ini" />
            <div className="mt-4 overflow-x-auto">
              {bacaans.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada catatan bacaan pada periode ini</p> : (<>
                <div className="space-y-3 md:hidden">
                  {bacaans.map((r) => (
                    <details key={r.id} className="rounded-lg border border-border p-3">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{formatDateShort(r.tanggal)}</p><p className="mt-1 text-sm text-muted-foreground">{bacaanDetail(r)}</p></div>{r.status && <Badge variant={BAC_BADGE[r.status] ?? "secondary"}>{BAC_STATUS[r.status] ?? r.status}</Badge>}</div>
                        <p className="mt-2 text-xs font-medium text-primary">Lihat detail</p>
                      </summary>
                      <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground"><p>Pengajar Pencatat: {r.pengajar?.nama ?? "-"}</p>{r.catatan && <p>Catatan: {r.catatan}</p>}</div>
                    </details>
                  ))}
                </div>
                <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Tanggal</th>
                      <th className="py-2 pr-3 font-medium">Jenis</th>
                      <th className="py-2 pr-3 font-medium">Jilid/Juz</th>
                      <th className="py-2 pr-3 font-medium">Surat</th>
                      <th className="py-2 pr-3 font-medium">Ayat/Halaman</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Pengajar Pencatat</th>
                      <th className="py-2 font-medium">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bacaans.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3 text-muted-foreground">{formatDateShort(r.tanggal)}</td>
                        <td className="py-2.5 pr-3">{r.jenis_bacaan === "IQRA" ? "Iqra" : "Al-Qur'an"}</td>
                        <td className="py-2.5 pr-3">{r.jenis_bacaan === "IQRA" ? `Jilid ${r.jilid}` : `Juz ${r.juz ?? "-"}`}</td>
                        <td className="py-2.5 pr-3">{r.jenis_bacaan === "QURAN" ? r.surat?.nama ?? "-" : "-"}</td>
                        <td className="py-2.5 pr-3">{r.jenis_bacaan === "IQRA" ? `Hal. ${r.halaman}` : r.ayat_mulai ? `Ayat ${r.ayat_mulai}-${r.ayat_selesai}` : "-"}</td>
                        <td className="py-2.5 pr-3">{r.status ? <Badge variant={BAC_BADGE[r.status] ?? "secondary"}>{BAC_STATUS[r.status]}</Badge> : "-"}</td>
                        <td className="py-2.5 text-muted-foreground">{r.pengajar?.nama ?? "-"}</td>
                        <td className="py-2.5 text-muted-foreground">{r.catatan ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div></>)}
            </div>
          </section>)}

          {showHafalan && (<section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Hafalan Surat" description={`Capaian hafalan hingga ${formatDate(dateTo)}.`} />
            {suratDetail.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Belum ada hafalan surat pada periode ini</p> : (
              <div className="mt-4 space-y-4">
                {suratDetail.map((s) => (
                  <div key={s.suratId} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{s.nama}</p>
                        <p className="text-xs text-muted-foreground">Progress: ayat 1–{s.max} dari {s.jumlah} ayat · {s.jumlah ? Math.round((s.max / s.jumlah) * 100) : 0}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.max >= s.jumlah ? "success" : "warning"}>{s.max >= s.jumlah ? "Tuntas" : "Sedang"}</Badge>
                        {s.latestStatus ? <Badge variant={BAC_BADGE[s.latestStatus] ?? "secondary"}>{BAC_STATUS[s.latestStatus]}</Badge> : null}
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${s.jumlah ? Math.min(100, (s.max / s.jumlah) * 100) : 0}%` }} />
                    </div>
                    <div className="mt-3 space-y-1">
                      {s.rows.map((c) => (
                        <div key={c.id} className="rounded-md border border-border/70 px-3 py-2 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-foreground">Ayat {c.ayat_mulai}–{c.ayat_selesai}</span>
                            <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatDateShort(c.tanggal)}</span>
                            {c.status ? <Badge variant={BAC_BADGE[c.status] ?? "secondary"}>{BAC_STATUS[c.status]}</Badge> : null}
                            <span className="text-xs text-muted-foreground">Pengajar Pencatat: {c.pengajar?.nama ?? "-"}</span>
                            </div>
                          </div>
                          {c.catatan && <p className="mt-2 text-xs text-muted-foreground">Catatan: {c.catatan}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>)}

          {showHafalan && (<section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Hafalan Doa" description={`Status hafalan terakhir hingga ${formatDate(dateTo)}.`} />
            <div className="mt-4 overflow-x-auto">
              {doaList.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada hafalan doa hingga tanggal akhir periode.</p> : (<>
                <div className="space-y-3 md:hidden">
                  {doaList.map((d) => <div key={d.nama} className="rounded-lg border border-border p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{d.nama}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateShort(d.tanggal)} · Pengajar Pencatat: {d.pengajar}</p></div>{d.status && <Badge variant={BAC_BADGE[d.status] ?? "secondary"}>{BAC_STATUS[d.status] ?? d.status}</Badge>}</div>{d.catatan && <p className="mt-2 text-sm text-muted-foreground">Catatan: {d.catatan}</p>}</div>)}
                </div>
                <div className="hidden md:block"><table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Nama Doa</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Tanggal Terakhir</th>
                      <th className="py-2 font-medium">Pengajar Pencatat</th>
                      <th className="py-2 font-medium">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doaList.map((d) => (
                      <tr key={d.nama} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3">{d.nama}</td>
                        <td className="py-2.5 pr-3">{d.status ? <Badge variant={BAC_BADGE[d.status] ?? "secondary"}>{BAC_STATUS[d.status]}</Badge> : "-"}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{formatDateShort(d.tanggal)}</td>
                        <td className="py-2.5 text-muted-foreground">{d.pengajar}</td>
                        <td className="py-2.5 text-muted-foreground">{d.catatan ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div></>)}
            </div>
          </section>)}

          {showSalat && (<section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Praktik Salat" description={`Gerakan dan niat yang dicatat pada periode ini hingga ${formatDate(dateTo)}.`} />
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">A. Gerakan Salat</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Tanggal</th><th className="py-2 pr-3 font-medium">Komponen</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Catatan</th><th className="py-2 font-medium">Pengajar Pencatat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gerakanSalatKomponens.length === 0 ? (
                        <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Belum ada penilaian gerakan salat pada periode ini.</td></tr>
                      ) : gerakanSalatKomponens.map((detail) => {
                        const parent = gerakanSalats.find((gerakan) => gerakan.id === detail.perkembangan_gerakan_salat_id);
                        return (
                          <tr key={detail.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-3 text-muted-foreground">{parent ? formatDateShort(parent.tanggal) : "-"}</td>
                            <td className="py-2 pr-3">{detail.komponen_salat?.nama ?? "-"}</td>
                            <td className="py-2 pr-3"><Badge variant={SALAT_BADGE[detail.status] ?? "secondary"}>{SALAT_STATUS[detail.status] ?? detail.status}</Badge></td>
                            <td className="py-2 pr-3 text-muted-foreground">{parent?.catatan ?? "-"}</td>
                            <td className="py-2 text-muted-foreground">{parent?.pengajar?.nama ?? "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">B. Niat Salat</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Tanggal</th><th className="py-2 pr-3 font-medium">Jenis Salat</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Catatan</th><th className="py-2 font-medium">Pengajar Pencatat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {niatSalats.length === 0 ? <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Belum ada penilaian niat salat pada periode ini.</td></tr> : niatSalats.map((r) => (
                        <tr key={r.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 text-muted-foreground">{formatDateShort(r.tanggal)}</td>
                          <td className="py-2 pr-3">{r.jenis_salat?.nama ?? "-"}</td>
                          <td className="py-2 pr-3"><Badge variant={SALAT_BADGE[r.status] ?? "secondary"}>{SALAT_STATUS[r.status] ?? r.status}</Badge></td>
                          <td className="py-2 pr-3 text-muted-foreground">{r.catatan ?? "-"}</td>
                          <td className="py-2 text-muted-foreground">{r.pengajar?.nama ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {(komponenRows.length > 0 || praktiks.length > 0) && <p className="text-xs text-muted-foreground">Riwayat Praktik Salat versi sebelumnya tetap tersimpan dan tidak digabungkan dengan penilaian Gerakan/Niat baru.</p>}
            </div>
          </section>)}

          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">C. Riwayat kehadiran</p>
          </div>
          {showKehadiran && (<section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Kehadiran" description={`Rekap kehadiran pada periode ini (${totalPres} pertemuan)`} />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <StatCard label="Hadir" value={hadir} icon={CalendarCheck} className="border-emerald-200 bg-emerald-50/80 text-emerald-900" />
              <StatCard label="Sakit" value={sakit} icon={Activity} className="border-orange-200 bg-orange-50/80 text-orange-900" />
              <StatCard label="Izin" value={izin} icon={CalendarX} className="border-amber-200 bg-amber-50/80 text-amber-900" />
              <StatCard label="Alpa" value={alpa} icon={UserX} className="border-rose-200 bg-rose-50/80 text-rose-900" />
              <StatCard label="Persentase" value={`${rate}%`} icon={TrendingUp} className="border-sky-200 bg-sky-50/80 text-sky-900" />
            </div>
            <div className="mt-4 overflow-x-auto">
              {presensis.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada presensi pada periode ini</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Tanggal</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 font-medium">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presensis.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3 text-muted-foreground">{formatDateShort(r.tanggal)}</td>
                        <td className="py-2.5 pr-3"><Badge variant={getStatusBadgeVariant(r.status)}>{formatStatus(r.status)}</Badge></td>
                        <td className="py-2.5 text-muted-foreground">{r.keterangan ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>)}

          <footer className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
            <span>Setiap riwayat menampilkan Pengajar Pencatat berdasarkan catatan perkembangan yang tersimpan.</span>
          </footer>
        </>
      )}
    </div>
  );
}
