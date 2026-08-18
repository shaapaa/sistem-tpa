"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, BookOpen, BookMarked, Moon, FileText } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { createReportPdf } from "@/lib/report-pdf";

interface SantriData {
  id: string;
  nama: string;
  sesi: string | null;
}

interface Perkembangan {
  id: string;
  tanggal: string;
  tipe_perkembangan: string;
  jenis_bacaan: string | null;
  iqra_ke: number | null;
  halaman_iqra: number | null;
  juz: number | null;
  surah: string | null;
  nama_surah: string | null;
  jenis_sholat: string | null;
  penilaian: string | null;
  catatan: string | null;
}

interface Absensi {
  id: string;
  status: string;
  created_at: string;
  pertemuans?: { tanggal: string };
}

export default function OrangTuaLaporanPage() {
  const { user } = useAuth();
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [perkembangans, setPerkembangans] = useState<Perkembangan[]>([]);
  const [absensis, setAbsensis] = useState<Absensi[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: link } = await supabase
        .from("orang_tuas")
        .select("santri_id, santris(id, nama, sesi)")
        .eq("user_id", user.id)
        .single();

      if (!link?.santris) return;
      const santriData = link.santris as any;
      setSantri({ id: santriData.id, nama: santriData.nama, sesi: santriData.sesi });

      const { data: perk } = await supabase
        .from("perkembangan_santris")
        .select("*")
        .eq("student_id", link.santri_id)
        .order("tanggal", { ascending: false });

      setPerkembangans(perk ?? []);

      const { data: absen } = await supabase
        .from("absensis")
        .select("*, pertemuans(tanggal)")
        .eq("student_id", link.santri_id)
        .order("created_at", { ascending: false });

      setAbsensis(absen ?? []);
    };

    fetchData();
  }, [user]);

  const handleExportPDF = async () => {
    const attendanceRate = absensis.length > 0
      ? Math.round((absensis.filter(a => a.status === "HADIR").length / absensis.length) * 100)
      : 0;

    await createReportPdf({
      filename: `laporan-${(santri?.nama ?? "anak").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Laporan Perkembangan Santri",
      metadata: [
        `Nama: ${santri?.nama ?? "-"}`,
        `Kelas: ${santri?.sesi === "PAGI" ? "Pagi" : santri?.sesi === "SORE" ? "Sore" : "-"}`,
        `Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`,
      ],
      tables: [
        { title: "Ringkasan Kehadiran", head: ["Indikator", "Nilai"], body: [["Tingkat kehadiran", `${attendanceRate}%`], ["Total pertemuan", String(absensis.length)], ["Hadir", String(absensis.filter(a => a.status === "HADIR").length)], ["Izin/Sakit", String(absensis.filter(a => a.status === "IZIN" || a.status === "SAKIT").length)], ["Alpha", String(absensis.filter(a => a.status === "ALPHA").length)]] },
        { title: "Riwayat Lengkap Perkembangan", head: ["Tanggal", "Tipe", "Detail", "Penilaian", "Catatan"], body: perkembangans.map((item) => [formatDateShort(item.tanggal), item.tipe_perkembangan, item.tipe_perkembangan === "BACAAN" ? (item.jenis_bacaan === "IQRA" ? `Iqra ${item.iqra_ke} Hal. ${item.halaman_iqra}` : `${item.surah} Juz ${item.juz}`) : item.tipe_perkembangan === "HAFALAN" ? item.nama_surah ?? "-" : item.jenis_sholat ?? "-", item.penilaian ?? "-", item.catatan ?? "-"]) },
      ],
    });
  };

  const attendanceRate = absensis.length > 0
    ? Math.round((absensis.filter(a => a.status === "HADIR").length / absensis.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dokumen perkembangan" title="Laporan anak" description={`Rekap lengkap perkembangan ${santri?.nama ?? "anak Anda"}.`} backHref="/orang-tua" action={<Button onClick={handleExportPDF} className="h-9 px-4" disabled={perkembangans.length === 0}><Download className="mr-2 h-4 w-4" /> Unduh PDF</Button>} />

      {santri && (
        <div className="surface-panel border-l-4 border-l-primary p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3 text-primary font-bold text-lg">
              {santri.nama.charAt(0)}
            </div>
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
              <div className="text-3xl font-bold font-tabular">{perkembangans.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Perkembangan</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-panel">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold font-tabular">{absensis.length}</div>
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
          {perkembangans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center sm:p-8">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada data perkembangan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {perkembangans.map((p) => (
                <div key={p.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {p.tipe_perkembangan === "BACAAN" ? <BookOpen className="h-4 w-4" /> :
                     p.tipe_perkembangan === "HAFALAN" ? <BookMarked className="h-4 w-4" /> :
                     <Moon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">
                        {p.tipe_perkembangan === "BACAAN" ? "Bacaan" : p.tipe_perkembangan === "HAFALAN" ? "Hafalan" : "Sholat"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{formatDateShort(p.tanggal)}</span>
                      {p.penilaian && (
                        <Badge variant={p.penilaian === "BAIK" ? "success" : p.penilaian === "CUKUP_BAIK" ? "warning" : "destructive"}>
                          {p.penilaian}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-1">
                      {p.tipe_perkembangan === "BACAAN"
                        ? (p.jenis_bacaan === "IQRA" ? `Iqra ${p.iqra_ke} Halaman ${p.halaman_iqra}` : `${p.surah} Juz ${p.juz}`)
                        : p.tipe_perkembangan === "HAFALAN" ? p.nama_surah : p.jenis_sholat}
                    </p>
                    {p.catatan && <p className="text-sm text-muted-foreground/70 mt-1 italic">"{p.catatan}"</p>}
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
