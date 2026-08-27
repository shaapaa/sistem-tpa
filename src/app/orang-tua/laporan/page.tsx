"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Download, CalendarCheck, CalendarX, Activity, UserX, BookOpen } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { DatePicker } from "@/components/ui/date-picker";
import { createReportPdf } from "@/lib/report-pdf";

type SantriData = { id: string; nama: string; kelompok?: { nama: string; sesi?: { nama: string } | null; pengajar?: { nama: string } | null } | null } | null
type PresensiRow = { id: string; tanggal: string; status: string; keterangan: string | null }
type BacaanRow = { id: string; tanggal: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null }
type CicilanRow = { id: string; hafalan_santri_id: string; tanggal: string; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; hafalan_santri?: { surat?: { nama: string; jumlah_ayat: number } | null } | null }
type DoaRow = { id: string; tanggal: string; status: string | null; catatan: string | null; doa?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; status: string | null; catatan: string | null; komponen_salat_id: string; komponen_salat?: { nama: string } | null }
type PraktikRow = { id: string; tanggal: string; status: string | null; catatan: string | null; jenis_salat_id: string; jenis_salat?: { nama: string } | null }

const BAC_STATUS: Record<string, string> = { LANCAR: "Lancar", KURANG_LANCAR: "Kurang Lancar", TIDAK_LANCAR: "Tidak Lancar" }
const SALAT_STATUS: Record<string, string> = { LANCAR: "Lancar", BUTUH_BIMBINGAN: "Butuh Bimbingan" }
const BAC_BADGE: Record<string, "success" | "warning" | "destructive"> = { LANCAR: "success", KURANG_LANCAR: "warning", TIDAK_LANCAR: "destructive" }
const SALAT_BADGE: Record<string, "success" | "warning"> = { LANCAR: "success", BUTUH_BIMBINGAN: "warning" }

export default function OrangTuaLaporanPage() {
  const { user } = useAuth();
  const [santri, setSantri] = useState<SantriData>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [presensis, setPresensis] = useState<PresensiRow[]>([]);
  const [bacaans, setBacaans] = useState<BacaanRow[]>([]);
  const [cicilans, setCicilans] = useState<CicilanRow[]>([]);
  const [doas, setDoas] = useState<DoaRow[]>([]);
  const [komponens, setKomponens] = useState<{ id: string; nama: string }[]>([]);
  const [komponenRows, setKomponenRows] = useState<KomponenRow[]>([]);
  const [jenisSalats, setJenisSalats] = useState<{ id: string; nama: string }[]>([]);
  const [praktiks, setPraktiks] = useState<PraktikRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchId = async () => {
      if (!user) return;
      const { data: s } = await supabase
        .from("santri")
        .select("id, nama, kelompok(nama, sesi(nama), pengajar(nama))")
        .eq("profile_id", user.id)
        .single();
      if (!s) return;
      setSantri(s as unknown as SantriData);
    };
    fetchId();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!santri) return;
      const start = from ? `${from}T00:00:00` : null;
      const end = to ? `${to}T23:59:59` : null;

      let qB = supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, status, catatan, surat(nama)").eq("santri_id", santri.id).order("tanggal", { ascending: false });
      let qC = supabase.from("hafalan_surat_cicilan").select("id, hafalan_santri_id, tanggal, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(surat(nama, jumlah_ayat))").eq("hafalan_santri.santri_id", santri.id).order("tanggal", { ascending: false });
      let qD = supabase.from("perkembangan_hafalan_doa").select("id, tanggal, status, catatan, doa(nama)").eq("santri_id", santri.id).order("tanggal", { ascending: false });
      let qK = supabase.from("perkembangan_salat_komponen").select("id, tanggal, status, catatan, komponen_salat(nama)").eq("santri_id", santri.id).order("tanggal", { ascending: false });
      let qP = supabase.from("praktik_salat").select("id, tanggal, status, catatan, jenis_salat(nama)").eq("santri_id", santri.id).order("tanggal", { ascending: false });
      let qPr = supabase.from("presensi").select("id, tanggal, status, keterangan").eq("santri_id", santri.id).order("tanggal", { ascending: false });
      if (start && end) {
        qB = qB.gte("tanggal", start).lte("tanggal", end);
        qC = qC.gte("tanggal", start).lte("tanggal", end);
        qD = qD.gte("tanggal", start).lte("tanggal", end);
        qK = qK.gte("tanggal", start).lte("tanggal", end);
        qP = qP.gte("tanggal", start).lte("tanggal", end);
        qPr = qPr.gte("tanggal", start).lte("tanggal", end);
      }

      const [ba, ci, doa, ko, pk, pr, komM, js] = await Promise.all([
        qB,
        qC,
        qD,
        qK,
        qP,
        qPr,
        supabase.from("komponen_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("jenis_salat").select("id, nama").eq("aktif", true).order("nama"),
      ]);
      setBacaans((ba.data ?? []) as unknown as BacaanRow[]);
      setCicilans((ci.data ?? []) as unknown as CicilanRow[]);
      setDoas((doa.data ?? []) as unknown as DoaRow[]);
      setKomponenRows((ko.data ?? []) as unknown as KomponenRow[]);
      setPraktiks((pk.data ?? []) as unknown as PraktikRow[]);
      setPresensis((pr.data ?? []) as unknown as PresensiRow[]);
      setKomponens((komM.data ?? []) as { id: string; nama: string }[]);
      setJenisSalats((js.data ?? []) as { id: string; nama: string }[]);
    };
    fetchData();
  }, [santri, from, to]);

  if (!santri) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Dokumen perkembangan" title="Laporan anak" description="Rekap lengkap perkembangan anak Anda." backHref="/orang-tua" />
        <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
          <UserX className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Data anak tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const hadir = presensis.filter((r) => r.status === "HADIR").length;
  const sakit = presensis.filter((r) => r.status === "SAKIT").length;
  const izin = presensis.filter((r) => r.status === "IZIN").length;
  const alpa = presensis.filter((r) => r.status === "ALPHA").length;

  const bacaanDetail = (r: BacaanRow) => r.jenis_bacaan === "IQRA" ? `Iqra ${r.jilid} · Hal. ${r.halaman}` : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`;
  const bacaanLatest = bacaans[0] ?? null;

  const byHs = new Map<string, { nama: string; jumlah: number; max: number; latestStatus: string | null; latestTanggal: string; rows: CicilanRow[] }>();
  cicilans.forEach((c) => {
    const hsId = c.hafalan_santri_id;
    const cur = byHs.get(hsId) ?? { nama: c.hafalan_santri?.surat?.nama ?? "-", jumlah: c.hafalan_santri?.surat?.jumlah_ayat ?? 0, max: 0, latestStatus: null, latestTanggal: "", rows: [] };
    cur.max = Math.max(cur.max, c.ayat_selesai ?? 0);
    cur.rows.push(c);
    byHs.set(hsId, cur);
  });
  const suratDetail = [...byHs.values()].map((x) => {
    const rows = [...x.rows].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
    return { ...x, rows, latestStatus: rows[0]?.status ?? null, latestTanggal: rows[0]?.tanggal ?? "" };
  });

  const statusPerKomponen = new Map<string, { status: string; tanggal: string }>();
  komponenRows.forEach((k) => { if (!statusPerKomponen.has(k.komponen_salat_id)) statusPerKomponen.set(k.komponen_salat_id, { status: k.status ?? "", tanggal: k.tanggal }); });
  const statusPerJenis = new Map<string, { status: string; tanggal: string }>();
  praktiks.forEach((p) => { if (!statusPerJenis.has(p.jenis_salat_id)) statusPerJenis.set(p.jenis_salat_id, { status: p.status ?? "", tanggal: p.tanggal }); });
  const komponenLancar = [...statusPerKomponen.values()].filter((s) => s.status === "LANCAR").length;
  const komponenBimbingan = [...statusPerKomponen.values()].filter((s) => s.status === "BUTUH_BIMBINGAN").length;
  const doaLatest = doas[0] ?? null;

  const periodeLabel = from && to ? `${formatDateShort(from)} – ${formatDateShort(to)}` : "Semua waktu";
  const noData = presensis.length === 0 && bacaans.length === 0 && cicilans.length === 0 && doas.length === 0 && komponenRows.length === 0 && praktiks.length === 0;

  const handleExportPDF = async () => {
    await createReportPdf({
      filename: `laporan-perkembangan-${(santri?.nama ?? "anak").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Laporan Perkembangan Santri",
      metadata: [
        `Nama: ${santri?.nama ?? "-"}`,
        `Kelompok: ${santri?.kelompok?.nama ?? "-"} · Sesi: ${santri?.kelompok?.sesi?.nama ?? "-"} · Pengajar: ${santri?.kelompok?.pengajar?.nama ?? "-"}`,
        `Periode: ${periodeLabel}`,
        `Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`,
      ],
      tables: [
        { title: "Presensi", head: ["Indikator", "Jumlah"], body: [["Hadir", String(hadir)], ["Sakit", String(sakit)], ["Izin", String(izin)], ["Alpa", String(alpa)], ["Total", String(presensis.length)]] },
        { title: "Bacaan", head: ["Tanggal", "Materi", "Status", "Catatan"], body: bacaans.map((r) => [formatDateShort(r.tanggal), bacaanDetail(r), BAC_STATUS[r.status ?? ""] ?? r.status ?? "-", r.catatan ?? "-"]) },
        { title: "Hafalan Surat", head: ["Surat", "Capaian", "Status Terakhir", "Tanggal"], body: suratDetail.map((s) => [s.nama, `${s.max}/${s.jumlah} ayat`, BAC_STATUS[s.latestStatus ?? ""] ?? s.latestStatus ?? "-", s.latestTanggal ? formatDateShort(s.latestTanggal) : "-"]) },
        { title: "Hafalan Doa", head: ["Tanggal", "Doa", "Status", "Catatan"], body: doas.map((d) => [formatDateShort(d.tanggal), d.doa?.nama ?? "-", BAC_STATUS[d.status ?? ""] ?? d.status ?? "-", d.catatan ?? "-"]) },
        { title: "Komponen Salat", head: ["Komponen", "Status", "Tanggal"], body: komponens.map((k) => { const st = statusPerKomponen.get(k.id); return [k.nama, SALAT_STATUS[st?.status ?? ""] ?? "-", st?.status ? formatDateShort(st.tanggal) : "-"]; }) },
        { title: "Praktik Salat", head: ["Jenis Salat", "Status", "Tanggal"], body: jenisSalats.map((j) => { const st = statusPerJenis.get(j.id); return [j.nama, SALAT_STATUS[st?.status ?? ""] ?? "-", st?.status ? formatDateShort(st.tanggal) : "-"]; }) },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dokumen perkembangan" title="Laporan anak" description={`Rekap perkembangan ${santri?.nama ?? "anak Anda"} pada periode terpilih.`} backHref="/orang-tua" action={<Button onClick={handleExportPDF} className="h-9 px-4" disabled={noData}><Download className="mr-2 h-4 w-4" /> Unduh PDF</Button>} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[10px] text-muted-foreground">Tanggal mulai</Label>
          <DatePicker value={from} onChange={setFrom} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] text-muted-foreground">Tanggal akhir</Label>
          <DatePicker value={to} onChange={setTo} />
        </div>
      </div>

      <div className="surface-panel border-l-4 border-l-primary p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-3 text-lg font-bold text-primary">{(santri?.nama ?? "?").charAt(0)}</div>
          <div className="flex-1">
            <h2 className="font-medium text-foreground">{santri?.nama}</h2>
            <p className="text-sm text-muted-foreground">Kelompok {santri?.kelompok?.nama ?? "-"} · Sesi {santri?.kelompok?.sesi?.nama ?? "-"} · Pengajar: {santri?.kelompok?.pengajar?.nama ?? "-"}</p>
          </div>
          <Badge variant="outline" className="text-xs">{periodeLabel}</Badge>
        </div>
      </div>

      {noData ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada data perkembangan pada periode ini</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Presensi</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                <Row icon={CalendarCheck} label="Hadir" value={String(hadir)} className="text-success" />
                <Row icon={CalendarX} label="Sakit" value={String(sakit)} className="text-amber-600" />
                <Row icon={Activity} label="Izin" value={String(izin)} className="text-amber-600" />
                <Row icon={CalendarX} label="Alpa" value={String(alpa)} className="text-destructive" />
                <p className="border-t border-border pt-1.5 text-xs text-muted-foreground">Total {presensis.length} pertemuan</p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Bacaan</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                <p className="text-2xl font-bold font-tabular text-primary">{bacaans.length}</p>
                <p className="text-xs text-muted-foreground">catatan bacaan pada periode ini</p>
                {bacaanLatest && (
                  <div className="rounded-lg border border-border p-2.5">
                    <p className="text-xs text-muted-foreground">Terakhir · {formatDateShort(bacaanLatest.tanggal)}</p>
                    <p className="text-sm font-medium text-foreground">{bacaanDetail(bacaanLatest)}</p>
                    <p className="mt-1 text-xs">Status: {bacaanLatest.status ? <Badge variant={BAC_BADGE[bacaanLatest.status] ?? "secondary"}>{BAC_STATUS[bacaanLatest.status]}</Badge> : <span className="text-muted-foreground">-</span>}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Komponen Salat</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                <p className="text-2xl font-bold font-tabular text-primary">{komponenLancar + komponenBimbingan}<span className="text-sm font-normal text-muted-foreground"> / {komponens.length}</span></p>
                <p className="text-xs text-muted-foreground">komponen dinilai pada periode ini</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium text-success">{komponenLancar}</span> <span className="text-muted-foreground">Lancar</span></p>
                  <p><span className="font-medium text-amber-600">{komponenBimbingan}</span> <span className="text-muted-foreground">Butuh Bimbingan</span></p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Hafalan Doa</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                <p className="text-2xl font-bold font-tabular text-primary">{doas.length}</p>
                <p className="text-xs text-muted-foreground">doa dicatat pada periode ini</p>
                {doaLatest && (
                  <div className="rounded-lg border border-border p-2.5">
                    <p className="text-xs text-muted-foreground">Terakhir · {formatDateShort(doaLatest.tanggal)}</p>
                    <p className="text-sm font-medium text-foreground">{doaLatest.doa?.nama ?? "-"}</p>
                    <p className="mt-1 text-xs">Status: {doaLatest.status ? <Badge variant={BAC_BADGE[doaLatest.status] ?? "secondary"}>{BAC_STATUS[doaLatest.status]}</Badge> : <span className="text-muted-foreground">-</span>}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="card-elevated">
            <CardHeader><CardTitle className="text-sm font-medium">Hafalan Surat</CardTitle></CardHeader>
            <CardContent>
              {suratDetail.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada hafalan surat pada periode ini</p> : (
                <div className="space-y-2">
                  {suratDetail.map((s) => (
                    <div key={s.nama} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                      <span className="font-medium text-foreground">{s.nama}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{s.max} / {s.jumlah} ayat · {s.latestStatus ? <Badge variant={BAC_BADGE[s.latestStatus] ?? "secondary"}>{BAC_STATUS[s.latestStatus]}</Badge> : "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Komponen Salat</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {komponens.map((k) => {
                    const st = statusPerKomponen.get(k.id);
                    return (
                      <div key={k.id} className="rounded-lg border border-border p-2.5 text-center">
                        <p className="text-xs font-medium text-foreground">{k.nama}</p>
                        <p className="mt-0.5 text-xs">
                          {st?.status ? <Badge variant={SALAT_BADGE[st.status] ?? "secondary"}>{SALAT_STATUS[st.status]}</Badge> : <span className="text-muted-foreground">-</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Praktik Salat</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {jenisSalats.map((j) => {
                    const st = statusPerJenis.get(j.id);
                    return (
                      <div key={j.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
                        <span className="text-sm font-medium text-foreground">{j.nama}</span>
                        <div className="flex items-center gap-2">
                          {st?.status ? <Badge variant={SALAT_BADGE[st.status] ?? "secondary"}>{SALAT_STATUS[st.status]}</Badge> : <span className="text-xs text-muted-foreground">Belum Dinilai</span>}
                          {st?.status && <span className="text-xs text-muted-foreground">{formatDateShort(st.tanggal)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="card-elevated">
            <CardHeader><CardTitle className="text-sm font-medium">Riwayat Bacaan & Hafalan Doa</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Tanggal</th>
                      <th className="py-2 pr-3 font-medium">Jenis</th>
                      <th className="py-2 pr-3 font-medium">Materi</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bacaans.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3 text-muted-foreground">{formatDateShort(r.tanggal)}</td>
                        <td className="py-2.5 pr-3">{r.jenis_bacaan === "IQRA" ? "Iqra" : "Al-Qur'an"}</td>
                        <td className="py-2.5 pr-3">{bacaanDetail(r)}</td>
                        <td className="py-2.5 pr-3">{r.status ? <Badge variant={BAC_BADGE[r.status] ?? "secondary"}>{BAC_STATUS[r.status]}</Badge> : "-"}</td>
                        <td className="py-2.5 text-muted-foreground">{r.catatan ?? "-"}</td>
                      </tr>
                    ))}
                    {doas.map((d) => (
                      <tr key={d.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3 text-muted-foreground">{formatDateShort(d.tanggal)}</td>
                        <td className="py-2.5 pr-3">Hafalan Doa</td>
                        <td className="py-2.5 pr-3">{d.doa?.nama ?? "-"}</td>
                        <td className="py-2.5 pr-3">{d.status ? <Badge variant={BAC_BADGE[d.status] ?? "secondary"}>{BAC_STATUS[d.status]}</Badge> : "-"}</td>
                        <td className="py-2.5 text-muted-foreground">{d.catatan ?? "-"}</td>
                      </tr>
                    ))}
                    {bacaans.length === 0 && doas.length === 0 && <tr><td className="py-3 text-sm text-muted-foreground">Belum ada data</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value, className }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /> {label}</span>
      <span className={`font-semibold font-tabular ${className}`}>{value}</span>
    </div>
  );
}