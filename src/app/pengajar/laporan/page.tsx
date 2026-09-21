"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, CalendarDays, BookMarked, Moon, CalendarCheck, Activity, CalendarX, UserX, TrendingUp } from "lucide-react";
import { formatDate, formatDateShort, formatStatus, getStatusBadgeVariant } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { todayJakarta } from "@/lib/islamic-date";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/layout/stat-card";
import { EmptyState } from "@/components/layout/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createReportPdf } from "@/lib/report-pdf";
import { CapaianBar } from "@/components/layout/capaian-bar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const TARGET_SURAT = 38;

type SantriOpt = { id: string; nama: string }
type PresensiRow = { id: string; tanggal: string; status: string; keterangan: string | null }
type BacaanRow = { id: string; tanggal: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null }
type CicilanRow = { id: string; tanggal: string; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; hafalan_santri?: { santri_id: string; surat_id: string; surat?: { nama: string; jumlah_ayat: number; nomor: number } | null } | null }
type DoaRow = { id: string; tanggal: string; status: string | null; catatan: string | null; doa?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; status: string | null; catatan: string | null; komponen_salat_id: string; komponen_salat?: { nama: string } | null }
type PraktikRow = { id: string; tanggal: string; status: string | null; catatan: string | null; jenis_salat_id: string; jenis_salat?: { nama: string } | null }
type GerakanSalatRow = { id: string; tanggal: string; catatan: string | null }
type GerakanSalatKomponenRow = { id: string; perkembangan_gerakan_salat_id: string; status: string; komponen_salat?: { nama: string } | null }
type NiatSalatRow = { id: string; tanggal: string; status: string; catatan: string | null; jenis_salat?: { nama: string } | null }

const BAC_STATUS: Record<string, string> = { LANCAR: "Lancar", KURANG_LANCAR: "Kurang Lancar", TIDAK_LANCAR: "Tidak Lancar" }
const SALAT_STATUS: Record<string, string> = { LANCAR: "Lancar", BUTUH_BIMBINGAN: "Butuh Bimbingan" }
const BAC_BADGE: Record<string, "success" | "warning" | "destructive"> = { LANCAR: "success", KURANG_LANCAR: "warning", TIDAK_LANCAR: "destructive" }
const SALAT_BADGE: Record<string, "success" | "warning"> = { LANCAR: "success", BUTUH_BIMBINGAN: "warning" }
const progressionOrder = (nomor: number) => (nomor === 1 ? -1 : 114 - nomor)

function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
function firstOfMonth(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01` }

export default function LaporanPage() {
  const { user } = useAuth();
  const [santris, setSantris] = useState<SantriOpt[]>([]);
  const [selectedSantri, setSelectedSantri] = useState("");
  const [dateFrom, setDateFrom] = useState(() => firstOfMonth(new Date()));
  const [dateTo, setDateTo] = useState(() => isoDate(new Date()));
  const [reportKey, setReportKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [santri, setSantri] = useState<{ nama: string; kelompok?: { nama: string; sesi?: { nama: string } | null; pengajar?: { nama: string } | null } | null } | null>(null);
  const [presensis, setPresensis] = useState<PresensiRow[]>([]);
  const [bacaans, setBacaans] = useState<BacaanRow[]>([]);
  const [cicilans, setCicilans] = useState<CicilanRow[]>([]);
  // Riwayat mengikuti periode; data cumulative adalah snapshot capaian sampai tanggal akhir periode.
  const [cumulativeBacaans, setCumulativeBacaans] = useState<BacaanRow[]>([]);
  const [cumulativeCicilans, setCumulativeCicilans] = useState<CicilanRow[]>([]);
  const [cumulativeDoas, setCumulativeDoas] = useState<DoaRow[]>([]);
  const [cumulativeKomponenRows, setCumulativeKomponenRows] = useState<KomponenRow[]>([]);
  const [cumulativePraktiks, setCumulativePraktiks] = useState<PraktikRow[]>([]);
  const [gerakanSalats, setGerakanSalats] = useState<GerakanSalatRow[]>([]);
  const [gerakanSalatKomponens, setGerakanSalatKomponens] = useState<GerakanSalatKomponenRow[]>([]);
  const [niatSalats, setNiatSalats] = useState<NiatSalatRow[]>([]);
  const [cumulativeNiatSalats, setCumulativeNiatSalats] = useState<NiatSalatRow[]>([]);
  const [komponens, setKomponens] = useState<{ id: string; nama: string }[]>([]);
  const [jenisSalats, setJenisSalats] = useState<{ id: string; nama: string }[]>([]);
  const [totalDoa, setTotalDoa] = useState(0);
  const [catatan, setCatatan] = useState("");
  const [rekomendasi, setRekomendasi] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const loadSantris = async () => {
      if (!user) return;
      const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single();
      if (!pengajar) return;
      const { data: k } = await supabase.from("kelompok").select("id");
      const kelompokIds = (k ?? []).map((x) => x.id);
      if (kelompokIds.length === 0) return;
      const { data } = await supabase.from("santri").select("id, nama").in("kelompok_id", kelompokIds).eq("is_active", true).order("nama");
      setSantris((data ?? []) as SantriOpt[]);
    };
    loadSantris();
  }, [user]);

  useEffect(() => {
    const generate = async () => {
      if (!reportKey || !selectedSantri || !dateFrom || !dateTo) return;
      setLoading(true);
      const sid = selectedSantri;
      const start = `${dateFrom}T00:00:00`;
      const end = `${dateTo}T23:59:59`;

      const [santriRes, pr, ba, ci, ge, ni, komM, js, doaCount, cumBa, cumCi, cumDoa, cumKo, cumPk, cumNi] = await Promise.all([
        supabase.from("santri").select("id, nama, kelompok(nama, sesi(nama), pengajar(nama))").eq("id", sid).single(),
        supabase.from("presensi").select("id, tanggal, status, keterangan").eq("santri_id", sid).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, ayat_mulai, ayat_selesai, status, catatan, surat(nama)").eq("santri_id", sid).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(santri_id, surat_id, surat(nama, jumlah_ayat, nomor))").eq("hafalan_santri.santri_id", sid).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_gerakan_salat").select("id, tanggal, catatan").eq("santri_id", sid).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_niat_salat").select("id, tanggal, status, catatan, jenis_salat(nama)").eq("santri_id", sid).gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("komponen_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("jenis_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("doa").select("id", { count: "exact", head: true }).eq("aktif", true),
        supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, ayat_mulai, ayat_selesai, status, catatan, surat(nama)").eq("santri_id", sid).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(santri_id, surat_id, surat(nama, jumlah_ayat, nomor))").eq("hafalan_santri.santri_id", sid).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, status, catatan, doa(nama)").eq("santri_id", sid).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, status, catatan, komponen_salat_id, komponen_salat(nama)").eq("santri_id", sid).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("praktik_salat").select("id, tanggal, status, catatan, jenis_salat_id, jenis_salat(nama)").eq("santri_id", sid).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_niat_salat").select("id, tanggal, status, catatan, jenis_salat(nama)").eq("santri_id", sid).lte("tanggal", end).order("tanggal", { ascending: false }),
      ]);

      const gerakanIds = (ge.data ?? []).map((row) => row.id);
      const gerakanKomponen = gerakanIds.length > 0
        ? await supabase.from("perkembangan_gerakan_salat_komponen").select("id, perkembangan_gerakan_salat_id, status, komponen_salat(nama)").in("perkembangan_gerakan_salat_id", gerakanIds)
        : { data: [], error: null };

      setSantri((santriRes.data ?? null) as unknown as typeof santri);
      setPresensis((pr.data ?? []) as unknown as PresensiRow[]);
      setBacaans((ba.data ?? []) as unknown as BacaanRow[]);
      setCicilans((ci.data ?? []) as unknown as CicilanRow[]);
      setCumulativeBacaans((cumBa.data ?? []) as unknown as BacaanRow[]);
      setCumulativeCicilans((cumCi.data ?? []) as unknown as CicilanRow[]);
      setCumulativeDoas((cumDoa.data ?? []) as unknown as DoaRow[]);
      setCumulativeKomponenRows((cumKo.data ?? []) as unknown as KomponenRow[]);
      setCumulativePraktiks((cumPk.data ?? []) as unknown as PraktikRow[]);
      setGerakanSalats((ge.data ?? []) as unknown as GerakanSalatRow[]);
      setGerakanSalatKomponens((gerakanKomponen.data ?? []) as unknown as GerakanSalatKomponenRow[]);
      setNiatSalats((ni.data ?? []) as unknown as NiatSalatRow[]);
      setCumulativeNiatSalats((cumNi.data ?? []) as unknown as NiatSalatRow[]);
      setKomponens((komM.data ?? []) as { id: string; nama: string }[]);
      setJenisSalats((js.data ?? []) as { id: string; nama: string }[]);
      setTotalDoa(doaCount.count ?? 0);
      setLoading(false);
    };
    generate();
  }, [reportKey, selectedSantri, dateFrom, dateTo]);

  // ---- computed ----
  const hadir = presensis.filter((r) => r.status === "HADIR").length;
  const sakit = presensis.filter((r) => r.status === "SAKIT").length;
  const izin = presensis.filter((r) => r.status === "IZIN").length;
  const alpa = presensis.filter((r) => r.status === "ALPHA").length;
  const totalPres = presensis.length;
  const rate = totalPres ? Math.round((hadir / totalPres) * 100) : 0;

  const bacaanDetail = (r: BacaanRow) => r.jenis_bacaan === "IQRA" ? `Jilid ${r.jilid} · Hal. ${r.halaman}` : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`;
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
    return { ...x, rows, latestStatus: rows[0]?.status ?? null, latestTanggal: rows[0]?.tanggal ?? "" };
  }).sort((a, b) => progressionOrder(a.nomor) - progressionOrder(b.nomor));
  const suratTuntas = suratDetail.filter((s) => s.max >= s.jumlah).length;
  const suratSedang = suratDetail.filter((s) => s.max < s.jumlah).length;

  // Tren kumulatif: jumlah surat dimulai & tuntas per tanggal setoran
  const trendState = new Map<string, { jumlah: number; max: number }>();
  const trend: { label: string; dimulai: number; tuntas: number }[] = [];
  [...cumulativeCicilans].sort((a, b) => (a.tanggal > b.tanggal ? 1 : -1)).forEach((c) => {
    const hs = c.hafalan_santri;
    const surat = hs?.surat;
    if (!hs || !surat) return;
    const cur = trendState.get(hs.surat_id) ?? { jumlah: surat.jumlah_ayat, max: 0 };
    cur.max = Math.max(cur.max, c.ayat_selesai ?? 0);
    trendState.set(hs.surat_id, cur);
    const dimulai = trendState.size;
    const tuntas = [...trendState.values()].filter((s) => s.max >= s.jumlah).length;
    const label = new Date(c.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    const last = trend[trend.length - 1];
    if (last && last.label === label) { last.dimulai = dimulai; last.tuntas = tuntas; }
    else trend.push({ label, dimulai, tuntas });
  });

  const doaMap = new Map<string, { nama: string; status: string | null; tanggal: string }>();
  cumulativeDoas.forEach((d) => { if (!d.doa?.nama) return; if (!doaMap.has(d.doa.nama)) doaMap.set(d.doa.nama, { nama: d.doa.nama, status: d.status, tanggal: d.tanggal }); });
  const doaList = [...doaMap.values()];
  const doaLancar = doaList.filter((d) => d.status === "LANCAR").length;
  const doaKurang = doaList.filter((d) => d.status === "KURANG_LANCAR").length;
  const doaTidak = doaList.filter((d) => d.status === "TIDAK_LANCAR").length;

  const komponenLatest = new Map<string, { status: string; tanggal: string }>();
  cumulativeKomponenRows.forEach((r) => { if (!komponenLatest.has(r.komponen_salat_id)) komponenLatest.set(r.komponen_salat_id, { status: r.status ?? "", tanggal: r.tanggal }); });
  const praktikLatest = new Map<string, { status: string; tanggal: string }>();
  cumulativePraktiks.forEach((r) => { if (!praktikLatest.has(r.jenis_salat_id)) praktikLatest.set(r.jenis_salat_id, { status: r.status ?? "", tanggal: r.tanggal }); });
  const niatLatest = new Map<string, { status: string; tanggal: string }>();
  cumulativeNiatSalats.forEach((r) => {
    const nama = r.jenis_salat?.nama;
    if (nama && !niatLatest.has(nama)) niatLatest.set(nama, { status: r.status, tanggal: r.tanggal });
  });
  const salatLancar = [...niatLatest.values()].filter((s) => s.status === "LANCAR").length;
  const salatBimbingan = [...niatLatest.values()].filter((s) => s.status === "BUTUH_BIMBINGAN").length;

  // Capaian (pencapaian, berdasar denominator nyata)
  const doaDihafal = doaList.length;
  const doaTotal = totalDoa || 22;
  const hafalanSuratPct = TARGET_SURAT ? Math.round((suratTuntas / TARGET_SURAT) * 100) : 0;
  const doaPct = doaTotal ? Math.round((doaDihafal / doaTotal) * 100) : 0;
  const salatPct = jenisSalats.length ? Math.round((salatLancar / jenisSalats.length) * 100) : 0;
  const jilidPct = bacaanLatest?.jenis_bacaan === "IQRA" && bacaanLatest.jilid ? Math.round((bacaanLatest.jilid / 6) * 100) : 0;
  const bacaanPosisi = bacaanLatest
    ? bacaanLatest.jenis_bacaan === "IQRA"
      ? `Iqra Jilid ${bacaanLatest.jilid} · Halaman ${bacaanLatest.halaman}`
      : `${bacaanLatest.surat?.nama ?? "-"} · Juz ${bacaanLatest.juz ?? "-"}`
    : "Belum ada catatan bacaan";

  const noPeriodData = presensis.length === 0 && bacaans.length === 0 && cicilans.length === 0 &&
    ![...cumulativeDoas, ...cumulativeKomponenRows, ...cumulativePraktiks, ...niatSalats, ...gerakanSalats].some((row) => row.tanggal >= dateFrom);
  const noCumulativeData = cumulativeBacaans.length === 0 && cumulativeCicilans.length === 0 && cumulativeDoas.length === 0 && cumulativeKomponenRows.length === 0 && cumulativePraktiks.length === 0 && cumulativeNiatSalats.length === 0;
  const noData = noPeriodData && noCumulativeData;
  const reportReady = reportKey > 0;

  const handlePrint = async () => {
    if (!santri || noData) return;
    const periode = `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;
    await createReportPdf({
      filename: `laporan-perkembangan-${santri.nama.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${todayJakarta()}.pdf`,
      title: "Laporan Perkembangan Santri",
      metadata: [
        `Nama: ${santri.nama}`,
        `Kelompok: ${santri.kelompok?.nama ?? "-"} · Sesi: ${santri.kelompok?.sesi?.nama ?? "-"} · Pengajar: ${santri.kelompok?.pengajar?.nama ?? "-"}`,
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
        ...(trend.length >= 2 ? [{ title: "Tren Hafalan Surat", head: ["Tanggal", "Surat Dimulai", "Surat Tuntas"], body: trend.map((t) => [t.label, String(t.dimulai), String(t.tuntas)]) }] : []),
        { title: "Kehadiran", head: ["Indikator", "Jumlah"], body: [["Hadir", String(hadir)], ["Sakit", String(sakit)], ["Izin", String(izin)], ["Alpa", String(alpa)], ["Total", String(totalPres)]] },
        { title: "Ringkasan Hafalan Surat", head: ["Indikator", "Jumlah"], body: [["Surat tuntas", String(suratTuntas)], ["Surat sedang dihafal", String(suratSedang)], ["Target surat (Juz 30 + Al-Fatihah)", String(TARGET_SURAT)]] },
        { title: "Perkembangan Bacaan", head: ["Tanggal", "Jenis", "Materi", "Status", "Catatan"], body: bacaans.map((r) => [formatDateShort(r.tanggal), r.jenis_bacaan === "IQRA" ? "Iqra" : "Al-Qur'an", bacaanDetail(r), BAC_STATUS[r.status ?? ""] ?? r.status ?? "-", r.catatan ?? "-"]) },
        { title: "Hafalan Surat", head: ["Surat", "Capaian", "Status Terakhir"], body: suratDetail.map((s) => [s.nama, `${s.max}/${s.jumlah} ayat · ${s.max >= s.jumlah ? "Tuntas" : "Sedang"}`, BAC_STATUS[s.latestStatus ?? ""] ?? s.latestStatus ?? "-"]) },
        { title: "Riwayat Cicilan Hafalan", head: ["Tanggal", "Surat", "Ayat", "Status"], body: cicilans.filter((c) => c.hafalan_santri?.surat).map((c) => [formatDateShort(c.tanggal), c.hafalan_santri?.surat?.nama ?? "-", `${c.ayat_mulai}-${c.ayat_selesai}`, BAC_STATUS[c.status ?? ""] ?? c.status ?? "-"]) },
        { title: "Hafalan Doa", head: ["Doa", "Status", "Tanggal"], body: doaList.map((d) => [d.nama, BAC_STATUS[d.status ?? ""] ?? d.status ?? "-", formatDateShort(d.tanggal)]) },
        { title: "Praktik Salat — Gerakan (Model Baru)", head: ["Tanggal", "Komponen Gerakan", "Status", "Catatan Sesi"], body: gerakanSalatKomponens.map((detail) => { const parent = gerakanSalats.find((gerakan) => gerakan.id === detail.perkembangan_gerakan_salat_id); return [parent ? formatDateShort(parent.tanggal) : "-", detail.komponen_salat?.nama ?? "-", SALAT_STATUS[detail.status] ?? detail.status, parent?.catatan ?? "-"]; }) },
        { title: "Praktik Salat — Niat (Model Baru)", head: ["Tanggal", "Jenis Salat", "Status", "Catatan"], body: niatSalats.map((r) => [formatDateShort(r.tanggal), r.jenis_salat?.nama ?? "-", SALAT_STATUS[r.status] ?? r.status, r.catatan ?? "-"]) },
        ...(cumulativeKomponenRows.length > 0 ? [{ title: "Riwayat Praktik Salat Lama — Komponen", head: ["Komponen", "Status", "Tanggal"], body: komponens.map((k) => { const st = komponenLatest.get(k.id); return [k.nama, SALAT_STATUS[st?.status ?? ""] ?? "Belum Dinilai", st?.status ? formatDateShort(st.tanggal) : "-"]; }) }] : []),
        ...(cumulativePraktiks.length > 0 ? [{ title: "Riwayat Praktik Salat Lama — Keseluruhan", head: ["Salat", "Status", "Tanggal"], body: jenisSalats.map((j) => { const st = praktikLatest.get(j.id); return [j.nama, SALAT_STATUS[st?.status ?? ""] ?? "Belum Dinilai", st?.status ? formatDateShort(st.tanggal) : "-"]; }) }] : []),
        { title: "Riwayat Kehadiran", head: ["Tanggal", "Status", "Keterangan"], body: presensis.map((r) => [formatDateShort(r.tanggal), formatStatus(r.status), r.keterangan ?? "-"]) },
      ],
      notes: [
        ...(catatan.trim() ? [{ title: "Catatan Pengajar", body: catatan }] : []),
        ...(rekomendasi.trim() ? [{ title: "Rekomendasi Pengajar", body: rekomendasi }] : []),
      ],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Laporan santri" title="Laporan Perkembangan Santri" description="Buat dan lihat laporan perkembangan santri berdasarkan periode pembelajaran." backHref="/pengajar" action={<Button onClick={handlePrint} className="h-9 px-4" disabled={!reportReady || noData}><Download className="mr-2 h-4 w-4" /> Cetak PDF</Button>} />

      <div className="surface-panel p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Santri</Label>
            <SearchableSelect
              value={selectedSantri}
              onChange={setSelectedSantri}
              placeholder="Pilih santri"
              options={santris.map((s) => ({ label: s.nama, value: s.id }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tanggal mulai</Label>
            <DatePicker value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tanggal selesai</Label>
            <DatePicker value={dateTo} onChange={setDateTo} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => setReportKey((k) => k + 1)} disabled={!selectedSantri} className="h-9 w-full px-4">
              Tampilkan Laporan
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      ) : !reportReady || noData ? (
        <EmptyState message="Belum ada laporan" hint="Pilih santri, atur periode, lalu klik Tampilkan Laporan." />
      ) : (
        <>
          {santri && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-700 via-primary to-teal-600 p-5 text-white">
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/15" />
              <div className="relative flex flex-wrap items-center gap-x-8 gap-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white/15 p-3 text-lg font-bold text-white">{santri.nama.charAt(0)}</div>
                  <div>
                    <p className="text-xs text-white/70">Nama Santri</p>
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
                <div>
                  <p className="text-xs text-white/70">Periode</p>
                  <p className="font-medium text-white">{formatDate(dateFrom)} – {formatDate(dateTo)}</p>
                </div>
              </div>
            </div>
          )}

          {noPeriodData && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">Tidak ada aktivitas baru pada periode ini. Capaian tetap ditampilkan hingga tanggal akhir periode.</p>
          )}

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard label="Kehadiran" value={`${hadir}/${totalPres}`} detail={`${rate}% kehadiran`} icon={CalendarDays} className="bg-gradient-to-br from-emerald-500 to-teal-700" />
            <StatCard label="Bacaan" value={BAC_STATUS[bacaanLatest?.status ?? ""] ?? "-"} detail={bacaanLatest ? bacaanDetail(bacaanLatest) : "belum ada catatan"} icon={FileText} className="bg-gradient-to-br from-amber-400 to-orange-600" />
            <StatCard label="Hafalan" value={`${suratTuntas} tuntas`} detail={`${suratSedang} sedang dihafal · ${TARGET_SURAT} target`} icon={BookMarked} className="bg-gradient-to-br from-indigo-500 to-violet-700" />
            <StatCard label="Praktik Salat" value={`${salatLancar} Lancar`} detail={`${salatBimbingan} Butuh Bimbingan`} icon={Moon} className="bg-gradient-to-br from-sky-500 to-blue-700" />
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
            {bacaanLatest?.jenis_bacaan === "QURAN" && (
              <p className="mt-3 text-xs text-muted-foreground">Posisi bacaan Al-Qur&apos;an saat ini: <strong className="text-foreground">{bacaanPosisi}</strong></p>
            )}
          </section>

          <section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Perkembangan Bacaan" description="Riwayat perkembangan bacaan santri pada periode ini" />
            <div className="mt-4 overflow-x-auto">
              {bacaans.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada catatan bacaan pada periode ini</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Tanggal</th>
                      <th className="py-2 pr-3 font-medium">Jenis</th>
                      <th className="py-2 pr-3 font-medium">Jilid/Juz</th>
                      <th className="py-2 pr-3 font-medium">Surat</th>
                      <th className="py-2 pr-3 font-medium">Ayat/Halaman</th>
                      <th className="py-2 font-medium">Status</th>
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
                        <td className="py-2.5">{r.status ? <Badge variant={BAC_BADGE[r.status] ?? "secondary"}>{BAC_STATUS[r.status]}</Badge> : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Hafalan Surat" description={`Capaian hafalan hingga ${formatDate(dateTo)}.`} />
            {trend.length >= 2 && (
              <div className="mt-4 rounded-lg border border-border/70 p-3 sm:p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Perkembangan hafalan (kumulatif jumlah surat)</p>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gTuntas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gDimulai" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.86 0.018 92)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.48 0.025 155)" }} tickLine={false} axisLine={{ stroke: "oklch(0.86 0.018 92)" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "oklch(0.48 0.025 155)" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.86 0.018 92)" }} />
                      <Area type="monotone" dataKey="dimulai" name="Surat dimulai" stroke="#f59e0b" strokeWidth={2} fill="url(#gDimulai)" />
                      <Area type="monotone" dataKey="tuntas" name="Surat tuntas" stroke="#10b981" strokeWidth={2} fill="url(#gTuntas)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Surat tuntas</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Surat dimulai</span>
                </div>
              </div>
            )}
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
                        <div key={c.id} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-1.5 text-sm">
                          <span className="text-foreground">Ayat {c.ayat_mulai}–{c.ayat_selesai}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatDateShort(c.tanggal)}</span>
                            {c.status ? <Badge variant={BAC_BADGE[c.status] ?? "secondary"}>{BAC_STATUS[c.status]}</Badge> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Hafalan Doa" description={`Status hafalan terakhir hingga ${formatDate(dateTo)}.`} />
            <div className="mt-4 overflow-x-auto">
              {doaList.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada hafalan doa pada periode ini</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Nama Doa</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Tanggal Terakhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doaList.map((d) => (
                      <tr key={d.nama} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3">{d.nama}</td>
                        <td className="py-2.5 pr-3">{d.status ? <Badge variant={BAC_BADGE[d.status] ?? "secondary"}>{BAC_STATUS[d.status]}</Badge> : "-"}</td>
                        <td className="py-2.5 text-muted-foreground">{formatDateShort(d.tanggal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {doaList.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-600" />Lancar: {doaLancar}</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Kurang Lancar: {doaKurang}</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />Tidak Lancar: {doaTidak}</span>
              </div>
            )}
          </section>

          <section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Praktik Salat" description={`Gerakan dan niat yang dicatat pada periode ini hingga ${formatDate(dateTo)}.`} />
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">A. Gerakan Salat</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Tanggal</th>
                        <th className="py-2 pr-3 font-medium">Komponen</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 font-medium">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gerakanSalatKomponens.length === 0 ? (
                        <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Belum ada penilaian gerakan salat pada periode ini.</td></tr>
                      ) : gerakanSalatKomponens.map((detail) => {
                        const parent = gerakanSalats.find((gerakan) => gerakan.id === detail.perkembangan_gerakan_salat_id);
                        return (
                          <tr key={detail.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-3 text-muted-foreground">{parent ? formatDateShort(parent.tanggal) : "-"}</td>
                            <td className="py-2 pr-3">{detail.komponen_salat?.nama ?? "-"}</td>
                            <td className="py-2 pr-3"><Badge variant={SALAT_BADGE[detail.status] ?? "secondary"}>{SALAT_STATUS[detail.status] ?? detail.status}</Badge></td>
                            <td className="py-2 text-muted-foreground">{parent?.catatan ?? "-"}</td>
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
                        <th className="py-2 pr-3 font-medium">Tanggal</th>
                        <th className="py-2 pr-3 font-medium">Jenis Salat</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 font-medium">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {niatSalats.length === 0 ? <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Belum ada penilaian niat salat pada periode ini.</td></tr> : niatSalats.map((r) => (
                        <tr key={r.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 text-muted-foreground">{formatDateShort(r.tanggal)}</td>
                          <td className="py-2 pr-3">{r.jenis_salat?.nama ?? "-"}</td>
                          <td className="py-2 pr-3"><Badge variant={SALAT_BADGE[r.status] ?? "secondary"}>{SALAT_STATUS[r.status] ?? r.status}</Badge></td>
                          <td className="py-2 text-muted-foreground">{r.catatan ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {(cumulativeKomponenRows.length > 0 || cumulativePraktiks.length > 0) && <p className="text-xs text-muted-foreground">Riwayat Praktik Salat versi sebelumnya tetap tersimpan dan tidak digabungkan dengan penilaian Gerakan/Niat baru.</p>}
            </div>
          </section>

          <section className="surface-panel p-5 sm:p-6">
            <SectionHeader title="Kehadiran" description={`Rekap kehadiran pada periode ini (${totalPres} pertemuan)`} />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <StatCard label="Hadir" value={hadir} icon={CalendarCheck} className="bg-gradient-to-br from-emerald-500 to-teal-700" />
              <StatCard label="Sakit" value={sakit} icon={Activity} className="bg-gradient-to-br from-orange-400 to-red-500" />
              <StatCard label="Izin" value={izin} icon={CalendarX} className="bg-gradient-to-br from-amber-400 to-orange-600" />
              <StatCard label="Alpa" value={alpa} icon={UserX} className="bg-gradient-to-br from-rose-500 to-red-600" />
              <StatCard label="Persentase" value={`${rate}%`} icon={TrendingUp} className="bg-gradient-to-br from-sky-500 to-blue-700" />
            </div>
            <div className="mt-4 overflow-x-auto">
              {presensis.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada presensi pada periode ini</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Tanggal</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Keterangan</th>
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
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface-panel p-5 sm:p-6">
              <SectionHeader title="Catatan Pengajar" description="Narasi perkembangan santri selama periode ini (tidak disimpan)" />
              <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Tulis catatan perkembangan santri..." className="mt-4 min-h-[120px]" />
            </section>
            <section className="surface-panel p-5 sm:p-6">
              <SectionHeader title="Rekomendasi Pengajar" description="Tindak lanjut yang disarankan untuk santri (tidak disimpan)" />
              <Textarea value={rekomendasi} onChange={(e) => setRekomendasi(e.target.value)} placeholder="Tulis rekomendasi / tindak lanjut..." className="mt-4 min-h-[120px]" />
            </section>
          </div>

          <footer className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Disusun oleh: <strong className="text-foreground">{santri?.kelompok?.pengajar?.nama ?? "-"}</strong></span>
              <span>Dicetak: {new Date().toLocaleDateString("id-ID")}</span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
