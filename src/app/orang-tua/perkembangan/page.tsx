"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, BookMarked, BookHeart, Moon, UserRound, UserX } from "lucide-react";
import { formatDateShort, formatSesi, formatTingkat } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";

type Pengajar = { nama: string }
type BacaanRow = { id: string; tanggal: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null; pengajar?: Pengajar | null }
type HafalanSuratRow = { id: string; surat_id: string; surat?: { nomor: number; nama: string; jumlah_ayat: number } | null }
type CicilanRow = { id: string; hafalan_santri_id: string; tanggal: string; ayat_mulai: number; ayat_selesai: number; status: string | null; catatan: string | null; pengajar?: Pengajar | null }
type DoaRow = { id: string; tanggal: string; status: string | null; catatan: string | null; doa?: { nama: string } | null; pengajar?: Pengajar | null }
type KomponenRow = { id: string; tanggal: string; status: string | null; komponen_salat_id: string }
type PraktikRow = { id: string; tanggal: string; status: string | null; jenis_salat_id: string }
type GerakanSalatRow = { id: string; tanggal: string; catatan: string | null; pengajar?: Pengajar | null }
type GerakanSalatKomponenRow = { id: string; perkembangan_gerakan_salat_id: string; status: string; komponen_salat?: { nama: string } | null }
type NiatSalatRow = { id: string; tanggal: string; status: string; catatan: string | null; jenis_salat?: { nama: string } | null; pengajar?: Pengajar | null }
type Santri = { id: string; nama: string; keterangan: string | null; kelompok?: { nama: string; sesi?: { nama: string } | null } | null }

const BAC_STATUS: Record<string, string> = { LANCAR: "Lancar", KURANG_LANCAR: "Kurang Lancar", TIDAK_LANCAR: "Tidak Lancar" }
const SALAT_STATUS: Record<string, string> = { LANCAR: "Lancar", BUTUH_BIMBINGAN: "Butuh Bimbingan" }
const BAC_BADGE: Record<string, "success" | "warning" | "destructive"> = { LANCAR: "success", KURANG_LANCAR: "warning", TIDAK_LANCAR: "destructive" }
const SALAT_BADGE: Record<string, "success" | "warning"> = { LANCAR: "success", BUTUH_BIMBINGAN: "warning" }
// Urutan hafalan bertahap: Al-Fatihah dulu, lalu Juz 30 dari An-Nas (114) mundur ke An-Naba (78)
const progressionOrder = (nomor: number) => (nomor === 1 ? -1 : 114 - nomor);

export default function PerkembanganPage() {
  const { user } = useAuth();
  const [santris, setSantris] = useState<Santri[]>([]);
  const [activeSantriId, setActiveSantriId] = useState<string | null>(null);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bacaans, setBacaans] = useState<BacaanRow[]>([]);
  const [hafalanSurat, setHafalanSurat] = useState<HafalanSuratRow[]>([]);
  const [cicilans, setCicilans] = useState<CicilanRow[]>([]);
  const [doas, setDoas] = useState<DoaRow[]>([]);
  const [komponens, setKomponens] = useState<{ id: string; nama: string }[]>([]);
  const [komponenRows, setKomponenRows] = useState<KomponenRow[]>([]);
  const [jenisSalats, setJenisSalats] = useState<{ id: string; nama: string }[]>([]);
  const [praktiks, setPraktiks] = useState<PraktikRow[]>([]);
  const [gerakanSalats, setGerakanSalats] = useState<GerakanSalatRow[]>([]);
  const [gerakanKomponens, setGerakanKomponens] = useState<GerakanSalatKomponenRow[]>([]);
  const [niatSalats, setNiatSalats] = useState<NiatSalatRow[]>([]);
  const supabase = createClient();
  const activeSantri = santris.find((santri) => santri.id === activeSantriId) ?? null;

  useEffect(() => {
    const fetchSantris = async () => {
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
        const nextSantris = (data ?? []) as unknown as Santri[];
        setSantris(nextSantris);
        setActiveSantriId((currentId) => nextSantris.some((santri) => santri.id === currentId) ? currentId : nextSantris[0]?.id ?? null);
      }
      setChildrenLoading(false);
    };
    fetchSantris();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const fetchPerkembangan = async () => {
      if (!activeSantriId) {
        setBacaans([]);
        setHafalanSurat([]);
        setCicilans([]);
        setDoas([]);
        setKomponens([]);
        setKomponenRows([]);
        setJenisSalats([]);
        setPraktiks([]);
        setGerakanSalats([]);
        setGerakanKomponens([]);
        setNiatSalats([]);
        return;
      }
      setDetailsLoading(true);
      setError(null);
      setBacaans([]);
      setHafalanSurat([]);
      setCicilans([]);
      setDoas([]);
      setKomponenRows([]);
      setPraktiks([]);
      setGerakanSalats([]);
      setGerakanKomponens([]);
      setNiatSalats([]);
      const [ba, hs, ci, doa, komM, kom, js, pk, gerakan, niat] = await Promise.all([
        supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, status, catatan, surat(nama), pengajar(nama)").eq("santri_id", activeSantriId).order("tanggal", { ascending: false }),
        supabase.from("hafalan_santri").select("id, surat_id, surat(nomor, nama, jumlah_ayat)").eq("santri_id", activeSantriId),
        supabase.from("hafalan_surat_cicilan").select("id, hafalan_santri_id, tanggal, ayat_mulai, ayat_selesai, status, catatan, pengajar(nama), hafalan_santri!inner(santri_id)").eq("hafalan_santri.santri_id", activeSantriId),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, status, catatan, doa(nama), pengajar(nama)").eq("santri_id", activeSantriId).order("tanggal", { ascending: false }),
        supabase.from("komponen_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, status, komponen_salat_id").eq("santri_id", activeSantriId).order("tanggal", { ascending: false }),
        supabase.from("jenis_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("praktik_salat").select("id, tanggal, status, jenis_salat_id").eq("santri_id", activeSantriId).order("tanggal", { ascending: false }),
        supabase.from("perkembangan_gerakan_salat").select("id, tanggal, catatan, pengajar(nama)").eq("santri_id", activeSantriId).order("tanggal", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("perkembangan_niat_salat").select("id, tanggal, status, catatan, jenis_salat(nama), pengajar(nama)").eq("santri_id", activeSantriId).order("tanggal", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const gerakanIds = (gerakan.data ?? []).map((item) => item.id);
      const gerakanKomponen = gerakanIds.length > 0
        ? await supabase.from("perkembangan_gerakan_salat_komponen").select("id, perkembangan_gerakan_salat_id, status, komponen_salat(nama)").in("perkembangan_gerakan_salat_id", gerakanIds)
        : { data: [], error: null };
      if (cancelled) return;
      const perkembanganError = [ba, hs, ci, doa, komM, kom, js, pk, gerakan, niat, gerakanKomponen].find((result) => result.error)?.error;
      if (perkembanganError) {
        setError("Data perkembangan tidak dapat dimuat. Silakan coba lagi.");
        setDetailsLoading(false);
        return;
      }
      setBacaans((ba.data ?? []) as unknown as BacaanRow[])
      setHafalanSurat((hs.data ?? []) as unknown as HafalanSuratRow[])
      setCicilans((ci.data ?? []) as unknown as CicilanRow[])
      setDoas((doa.data ?? []) as unknown as DoaRow[])
      setKomponens((komM.data ?? []) as { id: string; nama: string }[])
      setKomponenRows((kom.data ?? []) as unknown as KomponenRow[])
      setJenisSalats((js.data ?? []) as { id: string; nama: string }[])
      setPraktiks((pk.data ?? []) as unknown as PraktikRow[])
      setGerakanSalats((gerakan.data ?? []) as unknown as GerakanSalatRow[])
      setGerakanKomponens((gerakanKomponen.data ?? []) as unknown as GerakanSalatKomponenRow[])
      setNiatSalats((niat.data ?? []) as unknown as NiatSalatRow[])
      setDetailsLoading(false);
    };
    fetchPerkembangan();
    return () => { cancelled = true; };
  }, [activeSantriId]);

  if (childrenLoading) return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  if (error) return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center sm:p-12">
      <UserX className="mx-auto h-10 w-10 text-destructive/60 mb-3" />
      <p className="text-sm text-destructive">{error}</p>
    </div>
  );
  if (santris.length === 0 || !activeSantri) return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
      <UserX className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Belum ada data anak yang terhubung dengan akun ini.</p>
    </div>
  );

  // Hafalan surat: group cicilan per surat, hitung capaian maksimal
  const cicilanByHs = new Map<string, CicilanRow[]>();
  cicilans.forEach((c) => {
    const arr = cicilanByHs.get(c.hafalan_santri_id) ?? [];
    arr.push(c);
    cicilanByHs.set(c.hafalan_santri_id, arr);
  });
  const suratDetail = hafalanSurat.map((hs) => {
    const rows = (cicilanByHs.get(hs.id) ?? []).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
    const max = rows.reduce((m, r) => (r.ayat_selesai > m ? r.ayat_selesai : m), 0);
    const jumlah = hs.surat?.jumlah_ayat ?? 0;
    return {
      id: hs.id,
      nomor: hs.surat?.nomor ?? 999,
      nama: hs.surat?.nama ?? "-",
      jumlah,
      max,
      rows,
      latest: rows[0]?.tanggal ?? "",
    };
  }).sort((a, b) => (b.latest.localeCompare(a.latest) || progressionOrder(a.nomor) - progressionOrder(b.nomor)));

  // Praktik salat: status terakhir + tanggal per jenis
  const statusPerJenis = new Map<string, { status: string; tanggal: string }>();
  praktiks.forEach((p) => { if (!statusPerJenis.has(p.jenis_salat_id)) statusPerJenis.set(p.jenis_salat_id, { status: p.status ?? "", tanggal: p.tanggal }); });
  // Komponen salat: status terakhir + tanggal per komponen
  const statusPerKomponen = new Map<string, { status: string; tanggal: string }>();
  komponenRows.forEach((k) => { if (!statusPerKomponen.has(k.komponen_salat_id)) statusPerKomponen.set(k.komponen_salat_id, { status: k.status ?? "", tanggal: k.tanggal }); });
  const gerakanKomponenBySesi = new Map<string, GerakanSalatKomponenRow[]>();
  gerakanKomponens.forEach((komponen) => {
    const rows = gerakanKomponenBySesi.get(komponen.perkembangan_gerakan_salat_id) ?? [];
    rows.push(komponen);
    gerakanKomponenBySesi.set(komponen.perkembangan_gerakan_salat_id, rows);
  });
  const hasLegacySalat = komponenRows.length > 0 || praktiks.length > 0;
  const lastUpdate = [
    ...bacaans.map((row) => ({ tanggal: row.tanggal, kategori: "Bacaan" })),
    ...cicilans.map((row) => ({ tanggal: row.tanggal, kategori: "Hafalan Surat" })),
    ...doas.map((row) => ({ tanggal: row.tanggal, kategori: "Hafalan Doa" })),
    ...gerakanSalats.map((row) => ({ tanggal: row.tanggal, kategori: "Gerakan Salat" })),
    ...niatSalats.map((row) => ({ tanggal: row.tanggal, kategori: "Niat Salat" })),
  ].sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];
  const latestBacaan = bacaans[0];
  const doaDinilai = new Set(doas.map((row) => row.doa?.nama).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portal orang tua"
        title="Perkembangan"
        description={`Histori perkembangan bacaan, hafalan, dan praktik salat ${activeSantri.nama}.`}
        backHref="/orang-tua"
        action={santris.length > 1 ? (
          <div className="w-44">
            <Label className="text-[10px] text-muted-foreground">Pilih Anak</Label>
            <Select value={activeSantriId} onValueChange={(value: string | null) => value && setActiveSantriId(value)} items={santris.map((santri) => ({ label: santri.nama, value: santri.id }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {santris.map((santri) => <SelectItem key={santri.id} value={santri.id}>{santri.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : undefined}
      />

      <section className="surface-panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Detail perkembangan</p><p className="mt-1 text-lg font-semibold text-foreground">{activeSantri.nama}</p><p className="mt-1 text-sm text-muted-foreground">Kelompok {activeSantri.kelompok?.nama ?? "-"}{activeSantri.keterangan ? ` · ${formatTingkat(activeSantri.keterangan)}` : ""} · Sesi {formatSesi(activeSantri.kelompok?.sesi?.nama ?? "-")}</p></div>
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm"><p className="text-xs text-muted-foreground">Pembaruan terakhir</p><p className="mt-0.5 font-medium text-foreground">{lastUpdate ? `${lastUpdate.kategori} · ${formatDateShort(lastUpdate.tanggal)}` : "Belum ada penilaian"}</p></div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status terakhir</p>{latestBacaan ? <div className="mt-2 flex flex-wrap items-center gap-2"><p className="font-medium text-foreground">Bacaan · {latestBacaan.jenis_bacaan === "IQRA" ? `Iqra jilid ${latestBacaan.jilid} halaman ${latestBacaan.halaman}` : `${latestBacaan.surat?.nama ?? "Al-Qur'an"} · Juz ${latestBacaan.juz ?? "-"}`}</p>{latestBacaan.status && <Badge variant={BAC_BADGE[latestBacaan.status] ?? "secondary"}>{BAC_STATUS[latestBacaan.status] ?? latestBacaan.status}</Badge>}<span className="text-xs text-muted-foreground">{formatDateShort(latestBacaan.tanggal)}</span></div> : <p className="mt-2 text-sm text-muted-foreground">Belum ada penilaian perkembangan untuk ditampilkan.</p>}</section>

      {detailsLoading ? <div className="space-y-3"><div className="h-12 animate-pulse rounded-lg bg-muted" /><div className="h-64 animate-pulse rounded-xl bg-muted" /></div> : <Tabs defaultValue="bacaan" className="w-full">
        <TabsList className="grid h-auto min-h-12 w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="bacaan" className="gap-1 px-1 text-xs sm:text-sm"><BookOpen className="h-4 w-4" /> Bacaan</TabsTrigger>
          <TabsTrigger value="hafalan-surat" className="gap-1 px-1 text-xs sm:text-sm"><BookMarked className="h-4 w-4" /> Hafalan Surat</TabsTrigger>
          <TabsTrigger value="hafalan-doa" className="gap-1 px-1 text-xs sm:text-sm"><BookHeart className="h-4 w-4" /> Hafalan Doa</TabsTrigger>
          <TabsTrigger value="salat" className="gap-1 px-1 text-xs sm:text-sm"><Moon className="h-4 w-4" /><span className="sm:hidden">Salat</span><span className="hidden sm:inline">Praktik Salat</span></TabsTrigger>
        </TabsList>

        {/* TAB BACAAN */}
        <TabsContent value="bacaan" className="pt-4">
          <Card className="card-elevated">
            <CardHeader><CardTitle className="text-sm font-medium">Riwayat Bacaan</CardTitle><p className="text-sm text-muted-foreground">Status, catatan, dan pencatat setiap penilaian.</p></CardHeader>
            <CardContent>
              {bacaans.length === 0 ? <EmptyState message="Belum ada penilaian bacaan." hint="Penilaian bacaan anak akan tampil setelah dicatat pengajar." /> : <>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Tanggal</th>
                        <th className="py-2 pr-3 font-medium">Jenis</th>
                        <th className="py-2 pr-3 font-medium">Materi</th>
                        <th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Catatan</th><th className="py-2 font-medium">Pengajar Pencatat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bacaans.map((r) => (
                        <tr key={r.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 pr-3 text-muted-foreground">{formatDateShort(r.tanggal)}</td>
                          <td className="py-2.5 pr-3">{r.jenis_bacaan === "IQRA" ? "Iqra" : "Al-Qur'an"}</td>
                          <td className="py-2.5 pr-3">
                            {r.jenis_bacaan === "IQRA"
                              ? `Jilid ${r.jilid} · Halaman ${r.halaman}`
                              : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`}
                          </td>
                          <td className="py-2.5 pr-3">{r.status ? <Badge variant={BAC_BADGE[r.status] ?? "secondary"}>{BAC_STATUS[r.status] ?? r.status}</Badge> : "-"}</td><td className="max-w-56 py-2.5 pr-3 text-muted-foreground">{r.catatan ?? "-"}</td><td className="py-2.5 text-muted-foreground">{r.pengajar?.nama ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div><div className="space-y-3 sm:hidden">{bacaans.map((r) => <article key={r.id} className="rounded-lg border border-border p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{formatDateShort(r.tanggal)}</p><p className="mt-1 font-medium text-foreground">{r.jenis_bacaan === "IQRA" ? `Iqra jilid ${r.jilid} · Halaman ${r.halaman}` : `${r.surat?.nama ?? "Al-Qur'an"} · Juz ${r.juz ?? "-"}`}</p></div>{r.status && <Badge variant={BAC_BADGE[r.status] ?? "secondary"}>{BAC_STATUS[r.status] ?? r.status}</Badge>}</div>{r.catatan && <p className="mt-3 text-sm italic text-muted-foreground">&quot;{r.catatan}&quot;</p>}<RecordMeta tanggal={r.tanggal} pengajar={r.pengajar?.nama} /></article>)}</div></>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB HAFALAN SURAT */}
        <TabsContent value="hafalan-surat" className="pt-4">
          <div className="space-y-4">
            {suratDetail.length === 0 ? <EmptyState message="Belum ada perkembangan hafalan surat." hint="Capaian hafalan surat anak akan tampil setelah dinilai." /> : (
              suratDetail.map((s) => (
                <Card key={s.id} className="card-elevated">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{s.nama}</h3>
                      <span className="text-sm text-muted-foreground">{s.max} / {s.jumlah} ayat · {s.jumlah ? Math.round((s.max / s.jumlah) * 100) : 0}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${s.jumlah ? Math.min(100, (s.max / s.jumlah) * 100) : 0}%` }} />
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Histori Cicilan</p>
                      {s.rows.length === 0 ? <EmptyState message="Belum ada cicilan" className="py-6" /> : (
                        s.rows.map((c) => (
                          <div key={c.id} className="rounded-md border border-border px-3 py-2.5 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-foreground">Ayat {c.ayat_mulai}–{c.ayat_selesai}</span>{c.status && <Badge variant={BAC_BADGE[c.status] ?? "secondary"}>{BAC_STATUS[c.status] ?? c.status}</Badge>}</div>{c.catatan && <p className="mt-2 italic text-muted-foreground">&quot;{c.catatan}&quot;</p>}<RecordMeta tanggal={c.tanggal} pengajar={c.pengajar?.nama} /></div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* TAB HAFALAN DOA */}
        <TabsContent value="hafalan-doa" className="pt-4">
          <Card className="card-elevated">
            <CardHeader><CardTitle className="text-sm font-medium">Hafalan Doa</CardTitle><p className="text-sm text-muted-foreground">{doaDinilai} doa telah pernah dinilai.</p></CardHeader>
            <CardContent>
              {doas.length === 0 ? <EmptyState message="Belum ada penilaian hafalan doa." hint="Penilaian hafalan doa akan tampil setelah dicatat pengajar." /> : (
                <div className="space-y-2">
                  {doas.map((d) => (
                    <div key={d.id} className="rounded-lg border border-border px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-foreground">{d.doa?.nama ?? "-"}</span>{d.status && <Badge variant={BAC_BADGE[d.status] ?? "secondary"}>{BAC_STATUS[d.status] ?? d.status}</Badge>}</div>{d.catatan && <p className="mt-2 text-sm italic text-muted-foreground">&quot;{d.catatan}&quot;</p>}<RecordMeta tanggal={d.tanggal} pengajar={d.pengajar?.nama} /></div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB PRAKTIK SALAT */}
        <TabsContent value="salat" className="pt-4">
          <div className="space-y-4">
            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Gerakan Salat</CardTitle></CardHeader>
              <CardContent>
                {gerakanSalats.length === 0 ? <EmptyState message="Belum ada penilaian gerakan salat." hint="Penilaian komponen gerakan salat akan tampil setelah dicatat." /> : (
                  <div className="space-y-4">
                    {gerakanSalats.map((gerakan) => {
                      const detail = gerakanKomponenBySesi.get(gerakan.id) ?? [];
                      const lancar = detail.filter((komponen) => komponen.status === "LANCAR").length;
                      const bimbingan = detail.filter((komponen) => komponen.status === "BUTUH_BIMBINGAN").length;
                      return (
                        <div key={gerakan.id} className="rounded-lg border border-border p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-foreground">Penilaian gerakan</p>
                            <span className="text-xs text-muted-foreground">{formatDateShort(gerakan.tanggal)}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{detail.length} komponen</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{lancar} Lancar</span>{bimbingan > 0 && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{bimbingan} Butuh Bimbingan</span>}</div>
                          <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-primary">Lihat detail komponen</summary><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{detail.map((komponen) => <div key={komponen.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2 text-sm"><span className="font-medium text-foreground">{komponen.komponen_salat?.nama ?? "Komponen salat"}</span><Badge variant={SALAT_BADGE[komponen.status] ?? "secondary"}>{SALAT_STATUS[komponen.status] ?? komponen.status}</Badge></div>)}</div></details>
                          {gerakan.catatan && <p className="mt-3 border-t border-border/70 pt-3 text-sm italic text-muted-foreground">&quot;{gerakan.catatan}&quot;</p>}<RecordMeta tanggal={gerakan.tanggal} pengajar={gerakan.pengajar?.nama} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Niat Salat</CardTitle></CardHeader>
              <CardContent>
                {niatSalats.length === 0 ? <EmptyState message="Belum ada penilaian niat salat." hint="Riwayat penilaian niat salat akan tampil setelah dicatat." /> : (
                  <div className="space-y-2">
                    {niatSalats.map((niat) => (
                      <div key={niat.id} className="rounded-lg border border-border px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-foreground">{niat.jenis_salat?.nama ?? "Jenis salat"}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatDateShort(niat.tanggal)}</span>
                            <Badge variant={SALAT_BADGE[niat.status] ?? "secondary"}>{SALAT_STATUS[niat.status] ?? niat.status}</Badge>
                          </div>
                        </div>
                        {niat.catatan && <p className="mt-2 text-sm italic text-muted-foreground">&quot;{niat.catatan}&quot;</p>}<RecordMeta tanggal={niat.tanggal} pengajar={niat.pengajar?.nama} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {hasLegacySalat && (
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Riwayat Praktik Salat Sebelumnya</CardTitle>
                  <p className="text-sm text-muted-foreground">Data sebelum pembaruan sistem tetap disimpan sebagai riwayat legacy.</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {komponenRows.length > 0 && (
                    <div>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Komponen Salat</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {komponens.map((komponen) => {
                          const status = statusPerKomponen.get(komponen.id);
                          return (
                            <div key={komponen.id} className="rounded-lg border border-border p-3 text-center">
                              <p className="font-medium text-foreground">{komponen.nama}</p>
                              <p className="mt-1 text-sm">{status?.status ? <Badge variant={SALAT_BADGE[status.status] ?? "secondary"}>{SALAT_STATUS[status.status] ?? status.status}</Badge> : <span className="text-muted-foreground">-</span>}</p>
                              {status?.status && <p className="mt-1 text-xs text-muted-foreground">{formatDateShort(status.tanggal)}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {praktiks.length > 0 && (
                    <div>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Penilaian Keseluruhan</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {jenisSalats.map((jenis) => {
                          const status = statusPerJenis.get(jenis.id);
                          return (
                            <div key={jenis.id} className="rounded-lg border border-border p-3 text-center">
                              <p className="font-medium text-foreground">{jenis.nama}</p>
                              <p className="mt-1 text-sm">{status?.status ? <Badge variant={SALAT_BADGE[status.status] ?? "secondary"}>{SALAT_STATUS[status.status] ?? status.status}</Badge> : <span className="text-muted-foreground">Belum Dinilai</span>}</p>
                              {status?.status && <p className="mt-1 text-xs text-muted-foreground">{formatDateShort(status.tanggal)}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!hasLegacySalat && gerakanSalats.length === 0 && niatSalats.length === 0 && (
              <EmptyState message="Belum ada penilaian praktik salat." hint="Penilaian gerakan dan niat salat anak akan tampil setelah dicatat." />
            )}
          </div>
        </TabsContent>
      </Tabs>}
    </div>
  );
}

function RecordMeta({ tanggal, pengajar }: { tanggal: string; pengajar?: string }) {
  return <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{formatDateShort(tanggal)}</span><span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" /> Pengajar Pencatat: {pengajar ?? "-"}</span></div>
}
