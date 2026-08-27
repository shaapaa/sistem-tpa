"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BookMarked, BookHeart, Moon, UserX } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";

type BacaanRow = { id: string; tanggal: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null }
type HafalanSuratRow = { id: string; surat_id: string; surat?: { nomor: number; nama: string; jumlah_ayat: number } | null }
type CicilanRow = { id: string; hafalan_santri_id: string; tanggal: string; ayat_mulai: number; ayat_selesai: number; status: string | null }
type DoaRow = { id: string; tanggal: string; status: string | null; doa?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; status: string | null; komponen_salat_id: string }
type PraktikRow = { id: string; tanggal: string; status: string | null; jenis_salat_id: string }

const BAC_STATUS: Record<string, string> = { LANCAR: "Lancar", KURANG_LANCAR: "Kurang Lancar", TIDAK_LANCAR: "Tidak Lancar" }
const SALAT_STATUS: Record<string, string> = { LANCAR: "Lancar", BUTUH_BIMBINGAN: "Butuh Bimbingan" }
const BAC_BADGE: Record<string, "success" | "warning" | "destructive"> = { LANCAR: "success", KURANG_LANCAR: "warning", TIDAK_LANCAR: "destructive" }
const SALAT_BADGE: Record<string, "success" | "warning"> = { LANCAR: "success", BUTUH_BIMBINGAN: "warning" }
// Urutan hafalan bertahap: Al-Fatihah dulu, lalu Juz 30 dari An-Nas (114) mundur ke An-Naba (78)
const progressionOrder = (nomor: number) => (nomor === 1 ? -1 : 114 - nomor);

export default function PerkembanganPage() {
  const { user } = useAuth();
  const [santriId, setSantriId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bacaans, setBacaans] = useState<BacaanRow[]>([]);
  const [hafalanSurat, setHafalanSurat] = useState<HafalanSuratRow[]>([]);
  const [cicilans, setCicilans] = useState<CicilanRow[]>([]);
  const [doas, setDoas] = useState<DoaRow[]>([]);
  const [komponens, setKomponens] = useState<{ id: string; nama: string }[]>([]);
  const [komponenRows, setKomponenRows] = useState<KomponenRow[]>([]);
  const [jenisSalats, setJenisSalats] = useState<{ id: string; nama: string }[]>([]);
  const [praktiks, setPraktiks] = useState<PraktikRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: s } = await supabase.from("santri").select("id").eq("profile_id", user.id).single();
      if (!s) { setLoading(false); return; }
      setSantriId(s.id);

      const [ba, hs, ci, doa, komM, kom, js, pk] = await Promise.all([
        supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, status, catatan, surat(nama)").eq("santri_id", s.id).order("tanggal", { ascending: false }),
        supabase.from("hafalan_santri").select("id, surat_id, surat(nomor, nama, jumlah_ayat)").eq("santri_id", s.id),
        supabase.from("hafalan_surat_cicilan").select("id, hafalan_santri_id, tanggal, ayat_mulai, ayat_selesai, status"),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, status, doa(nama)").eq("santri_id", s.id).order("tanggal", { ascending: false }),
        supabase.from("komponen_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, status, komponen_salat_id").eq("santri_id", s.id).order("tanggal", { ascending: false }),
        supabase.from("jenis_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("praktik_salat").select("id, tanggal, status, jenis_salat_id").eq("santri_id", s.id).order("tanggal", { ascending: false }),
      ]);
      setBacaans((ba.data ?? []) as unknown as BacaanRow[])
      setHafalanSurat((hs.data ?? []) as unknown as HafalanSuratRow[])
      setCicilans((ci.data ?? []) as unknown as CicilanRow[])
      setDoas((doa.data ?? []) as unknown as DoaRow[])
      setKomponens((komM.data ?? []) as { id: string; nama: string }[])
      setKomponenRows((kom.data ?? []) as unknown as KomponenRow[])
      setJenisSalats((js.data ?? []) as { id: string; nama: string }[])
      setPraktiks((pk.data ?? []) as unknown as PraktikRow[])
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  if (!santriId) return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
      <UserX className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Data anak tidak ditemukan</p>
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

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Portal orang tua" title="Perkembangan" description="Histori perkembangan bacaan, hafalan, dan praktik salat anak." backHref="/orang-tua" />

      <Tabs defaultValue="bacaan" className="w-full">
        <TabsList className="grid min-h-12 h-auto w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="bacaan" className="gap-1 px-1 text-xs sm:text-sm"><BookOpen className="h-4 w-4" /> Bacaan</TabsTrigger>
          <TabsTrigger value="hafalan-surat" className="gap-1 px-1 text-xs sm:text-sm"><BookMarked className="h-4 w-4" /> Hafalan Surat</TabsTrigger>
          <TabsTrigger value="hafalan-doa" className="gap-1 px-1 text-xs sm:text-sm"><BookHeart className="h-4 w-4" /> Hafalan Doa</TabsTrigger>
          <TabsTrigger value="salat" className="gap-1 px-1 text-xs sm:text-sm"><Moon className="h-4 w-4" /> Praktik Salat</TabsTrigger>
        </TabsList>

        {/* TAB BACAAN */}
        <TabsContent value="bacaan" className="pt-4">
          <Card className="card-elevated">
            <CardHeader><CardTitle className="text-sm font-medium">Histori Bacaan</CardTitle></CardHeader>
            <CardContent>
              {bacaans.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada catatan bacaan</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Tanggal</th>
                        <th className="py-2 pr-3 font-medium">Jenis</th>
                        <th className="py-2 pr-3 font-medium">Materi</th>
                        <th className="py-2 font-medium">Status</th>
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
                          <td className="py-2.5">{r.status ? <Badge variant={BAC_BADGE[r.status] ?? "secondary"}>{BAC_STATUS[r.status] ?? r.status}</Badge> : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB HAFALAN SURAT */}
        <TabsContent value="hafalan-surat" className="pt-4">
          <div className="space-y-4">
            {suratDetail.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada hafalan surat</p> : (
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
                      {s.rows.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada cicilan</p> : (
                        s.rows.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                            <span className="text-foreground">Ayat {c.ayat_mulai}–{c.ayat_selesai}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{formatDateShort(c.tanggal)}</span>
                              {c.status && <Badge variant={BAC_BADGE[c.status] ?? "secondary"}>{BAC_STATUS[c.status] ?? c.status}</Badge>}
                            </div>
                          </div>
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
            <CardHeader><CardTitle className="text-sm font-medium">Histori Hafalan Doa</CardTitle></CardHeader>
            <CardContent>
              {doas.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada hafalan doa</p> : (
                <div className="space-y-2">
                  {doas.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
                      <span className="font-medium text-foreground">{d.doa?.nama ?? "-"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDateShort(d.tanggal)}</span>
                        {d.status && <Badge variant={BAC_BADGE[d.status] ?? "secondary"}>{BAC_STATUS[d.status] ?? d.status}</Badge>}
                      </div>
                    </div>
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
              <CardHeader><CardTitle className="text-sm font-medium">Komponen Salat</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {komponens.map((k) => {
                    const st = statusPerKomponen.get(k.id);
                    return (
                      <div key={k.id} className="rounded-lg border border-border p-3 text-center">
                        <p className="font-medium text-foreground">{k.nama}</p>
                        <p className="mt-1 text-sm">
                          {st?.status ? <Badge variant={SALAT_BADGE[st.status] ?? "secondary"}>{SALAT_STATUS[st.status] ?? st.status}</Badge> : <span className="text-muted-foreground">-</span>}
                        </p>
                        {st?.status && <p className="mt-1 text-xs text-muted-foreground">{formatDateShort(st.tanggal)}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Praktik Salat Keseluruhan</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {jenisSalats.map((j) => {
                    const st = statusPerJenis.get(j.id);
                    return (
                      <div key={j.id} className="rounded-lg border border-border p-3 text-center">
                        <p className="font-medium text-foreground">{j.nama}</p>
                        <p className="mt-1 text-sm">
                          {st?.status ? <Badge variant={SALAT_BADGE[st.status] ?? "secondary"}>{SALAT_STATUS[st.status] ?? st.status}</Badge> : <span className="text-muted-foreground">Belum Dinilai</span>}
                        </p>
                        {st?.status && <p className="mt-1 text-xs text-muted-foreground">{formatDateShort(st.tanggal)}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}