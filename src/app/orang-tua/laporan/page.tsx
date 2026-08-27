"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, BookOpen, BookMarked, Moon, FileText, HeartHandshake } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { createReportPdf } from "@/lib/report-pdf";

interface SantriData { id: string; nama: string; sesi: string | null }

interface Item {
  id: string
  tanggal: string
  tipe: string
  detail: string
  status: string | null
  catatan: string | null
}

type CicilanRow = { id: string; tanggal: string; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; hafalan_santri?: { surat?: { nama: string } | null } | null }
type DoaRow = { id: string; tanggal: string; status: string | null; catatan: string | null; doa?: { nama: string } | null }
type BacaanRow = { id: string; tanggal: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null }
type PraktikRow = { id: string; tanggal: string; status: string | null; catatan: string | null; jenis_salat?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; status: string | null; catatan: string | null; komponen_salat?: { nama: string } | null }

export default function OrangTuaLaporanPage() {
  const { user } = useAuth();
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [presensis, setPresensis] = useState<{ id: string; status: string; tanggal: string }[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: s } = await supabase
        .from("santri")
        .select("id, nama, kelompok(sesi(nama))")
        .eq("profile_id", user.id)
        .single();
      if (!s) return;
      const sd = s as unknown as { id: string; nama: string; kelompok?: { sesi?: { nama: string } | null } | null };
      setSantri({ id: sd.id, nama: sd.nama, sesi: sd.kelompok?.sesi?.nama ?? null });

      const [pr, ci, doa, ba, pk, ko] = await Promise.all([
        supabase.from("presensi").select("id, status, tanggal").eq("santri_id", sd.id).order("tanggal", { ascending: false }),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(surat(nama))").eq("hafalan_santri.santri_id", sd.id),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, status, catatan, doa(nama)").eq("santri_id", sd.id),
        supabase.from("perkembangan_bacaan").select("id, tanggal, jenis_bacaan, jilid, halaman, juz, status, catatan, surat(nama)").eq("santri_id", sd.id),
        supabase.from("praktik_salat").select("id, tanggal, status, catatan, jenis_salat(nama)").eq("santri_id", sd.id),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, status, catatan, komponen_salat(nama)").eq("santri_id", sd.id),
      ]);

      setPresensis((pr.data ?? []) as unknown as { id: string; status: string; tanggal: string }[])

      const build = (tipe: string) => (id: string, tanggal: string, detail: string, status: string | null, catatan: string | null): Item => ({ id, tanggal, tipe, detail, status, catatan })
      const list: Item[] = []
      ;((ba.data ?? []) as unknown as BacaanRow[]).forEach((r) => list.push(build("Bacaan")(r.id, r.tanggal, r.jenis_bacaan === "IQRA" ? `Iqra ${r.jilid} · Hal. ${r.halaman}` : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`, r.status, r.catatan)))
      ;((ci.data ?? []) as unknown as CicilanRow[]).forEach((r) => list.push(build("Hafalan Surat")(r.id, r.tanggal, `${r.hafalan_santri?.surat?.nama ?? "-"} · ayat ${r.ayat_mulai}-${r.ayat_selesai}`, r.status, r.catatan)))
      ;((doa.data ?? []) as unknown as DoaRow[]).forEach((r) => list.push(build("Hafalan Doa")(r.id, r.tanggal, r.doa?.nama ?? "-", r.status, r.catatan)))
      ;((ko.data ?? []) as unknown as KomponenRow[]).forEach((r) => list.push(build("Salat Komponen")(r.id, r.tanggal, r.komponen_salat?.nama ?? "-", r.status, r.catatan)))
      ;((pk.data ?? []) as unknown as PraktikRow[]).forEach((r) => list.push(build("Praktik Salat")(r.id, r.tanggal, r.jenis_salat?.nama ?? "-", r.status, r.catatan)))
      setItems(list.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)))
    };
    fetchData();
  }, [user]);

  const attendanceRate = presensis.length > 0
    ? Math.round((presensis.filter((a) => a.status === "HADIR").length / presensis.length) * 100)
    : 0;

  const handleExportPDF = async () => {
    await createReportPdf({
      filename: `laporan-${(santri?.nama ?? "anak").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Laporan Perkembangan Santri",
      metadata: [
        `Nama: ${santri?.nama ?? "-"}`,
        `Sesi: ${santri?.sesi === "PAGI" ? "Pagi" : santri?.sesi === "SORE" ? "Sore" : "-"}`,
        `Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`,
      ],
      tables: [
        { title: "Ringkasan Kehadiran", head: ["Indikator", "Nilai"], body: [["Tingkat kehadiran", `${attendanceRate}%`], ["Total pertemuan", String(presensis.length)], ["Hadir", String(presensis.filter((a) => a.status === "HADIR").length)], ["Izin/Sakit", String(presensis.filter((a) => a.status === "IZIN" || a.status === "SAKIT").length)], ["Alpha", String(presensis.filter((a) => a.status === "ALPHA").length)]] },
        { title: "Riwayat Lengkap Perkembangan", head: ["Tanggal", "Tipe", "Detail", "Status", "Catatan"], body: items.map((it) => [formatDateShort(it.tanggal), it.tipe, it.detail, it.status ?? "-", it.catatan ?? "-"]) },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dokumen perkembangan" title="Laporan anak" description={`Rekap lengkap perkembangan ${santri?.nama ?? "anak Anda"}.`} backHref="/orang-tua" action={<Button onClick={handleExportPDF} className="h-9 px-4" disabled={items.length === 0}><Download className="mr-2 h-4 w-4" /> Unduh PDF</Button>} />

      {santri && (
        <div className="surface-panel border-l-4 border-l-primary p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3 text-primary font-bold text-lg">{santri.nama.charAt(0)}</div>
            <div>
              <h2 className="font-medium text-foreground">{santri.nama}</h2>
              <p className="text-sm text-muted-foreground">{santri.sesi === "PAGI" ? "Sesi Pagi" : santri.sesi === "SORE" ? "Sesi Sore" : "-"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="surface-panel">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold font-tabular text-primary">{attendanceRate}%</div>
              <p className="text-sm text-muted-foreground mt-1">Tingkat Kehadiran</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-panel">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold font-tabular">{items.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Perkembangan</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-panel">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold font-tabular">{presensis.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Pertemuan</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-panel">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Riwayat Lengkap Perkembangan</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center sm:p-8">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada data perkembangan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((p) => (
                <div key={p.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {p.tipe.includes("Bacaan") ? <BookOpen className="h-4 w-4" /> :
                     p.tipe.includes("Hafalan") ? <BookMarked className="h-4 w-4" /> :
                     p.tipe.includes("Salat") ? <Moon className="h-4 w-4" /> :
                     <HeartHandshake className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{p.tipe}</Badge>
                      <span className="text-sm text-muted-foreground">{formatDateShort(p.tanggal)}</span>
                      {p.status && <Badge variant="outline">{p.status}</Badge>}
                    </div>
                    <p className="text-sm text-foreground mt-1">{p.detail}</p>
                    {p.catatan && <p className="text-sm text-muted-foreground/70 mt-1 italic">&quot;{p.catatan}&quot;</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}