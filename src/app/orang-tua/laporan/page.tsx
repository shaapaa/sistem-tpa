"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Calendar, BookOpen, BookMarked, Moon, FileText } from "lucide-react";
import Link from "next/link";
import { formatDateShort } from "@/lib/format";

interface SantriData {
  id: string;
  nama: string;
  groups?: { nama_group: string };
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
        .select("santri_id, santris(id, nama, groups(nama_group))")
        .eq("user_id", user.id)
        .single();

      if (!link?.santris) return;
      const santriData = link.santris as any;
      setSantri({ id: santriData.id, nama: santriData.nama, groups: santriData.groups });

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

  const handleExportPDF = () => {
    const content = generateReportContent();
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${santri?.nama ?? "anak"}-${new Date().toISOString().split("T")[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReportContent = () => {
    const attendanceRate = absensis.length > 0
      ? Math.round((absensis.filter(a => a.status === "HADIR").length / absensis.length) * 100)
      : 0;

    let html = `
      <html><head><title>Laporan Perkembangan - ${santri?.nama}</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}.stat{display:inline-block;margin:10px;padding:15px;border:1px solid #ddd;border-radius:8px}</style>
      </head><body>
      <h1>Laporan Perkembangan Santri</h1>
      <p><strong>Nama:</strong> ${santri?.nama}</p>
      <p><strong>Kelas:</strong> ${santri?.groups?.nama_group}</p>
      <p><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString("id-ID")}</p>
      
      <h2>Ringkasan Kehadiran</h2>
      <div class="stat"><strong>Tingkat Kehadiran:</strong> ${attendanceRate}%</div>
      <div class="stat"><strong>Total Pertemuan:</strong> ${absensis.length}</div>
      <div class="stat"><strong>Hadir:</strong> ${absensis.filter(a => a.status === "HADIR").length}</div>
      <div class="stat"><strong>Izin/Sakit:</strong> ${absensis.filter(a => a.status === "IZIN" || a.status === "SAKIT").length}</div>
      <div class="stat"><strong>Alpha:</strong> ${absensis.filter(a => a.status === "ALPHA").length}</div>
      
      <h2>Riwayat Perkembangan</h2>
      <table>
        <tr><th>Tanggal</th><th>Tipe</th><th>Detail</th><th>Penilaian</th><th>Catatan</th></tr>
    `;

    for (const item of perkembangans) {
      const detail = item.tipe_perkembangan === "BACAAN"
        ? (item.jenis_bacaan === "IQRA" ? `Iqra ${item.iqra_ke} Hal. ${item.halaman_iqra}` : `${item.surah} Juz ${item.juz}`)
        : item.tipe_perkembangan === "HAFALAN" ? item.nama_surah : item.jenis_sholat;
      html += `<tr><td>${formatDateShort(item.tanggal)}</td><td>${item.tipe_perkembangan}</td><td>${detail}</td><td>${item.penilaian ?? "-"}</td><td>${item.catatan ?? "-"}</td></tr>`;
    }

    html += `</table></body></html>`;
    return html;
  };

  const attendanceRate = absensis.length > 0
    ? Math.round((absensis.filter(a => a.status === "HADIR").length / absensis.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/orang-tua" className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Laporan Perkembangan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Rekap lengkap perkembangan {santri?.nama ?? "anak Anda"}</p>
        </div>
        <Button onClick={handleExportPDF} className="h-9 px-4" disabled={perkembangans.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Unduh PDF
        </Button>
      </div>

      {santri && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3 text-primary font-bold text-lg">
              {santri.nama.charAt(0)}
            </div>
            <div>
              <h2 className="font-medium text-foreground">{santri.nama}</h2>
              <p className="text-sm text-muted-foreground">{santri.groups?.nama_group ?? "-"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold font-tabular text-primary">{attendanceRate}%</div>
              <p className="text-sm text-muted-foreground mt-1">Tingkat Kehadiran</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold font-tabular">{perkembangans.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Perkembangan</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold font-tabular">{absensis.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Pertemuan</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Riwayat Lengkap Perkembangan</CardTitle>
        </CardHeader>
        <CardContent>
          {perkembangans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
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
