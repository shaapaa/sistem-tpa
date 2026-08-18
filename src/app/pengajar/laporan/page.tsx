"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { DatePicker } from "@/components/ui/date-picker";
import { createReportPdf } from "@/lib/report-pdf";

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
  santris?: { nama: string };
}

interface Santri { id: string; nama: string; }

export default function LaporanPage() {
  const { user } = useAuth();
  const [perkembangans, setPerkembangans] = useState<Perkembangan[]>([]);
  const [santris, setSantris] = useState<Santri[]>([]);
  const [selectedSesi, setSelectedSesi] = useState("");
  const [selectedSantri, setSelectedSantri] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [catatanLaporan, setCatatanLaporan] = useState("");
  const [catatanSaved, setCatatanSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchSantris = async () => {
      if (!selectedSesi) { setSantris([]); return; }
      const { data } = await supabase.from("santris").select("id, nama").eq("sesi", selectedSesi).order("nama");
      setSantris(data ?? []);
      setSelectedSantri("");
    };
    fetchSantris();
  }, [selectedSesi]);

  useEffect(() => {
    const fetchPerkembangan = async () => {
      if (!user) return;
      const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
      if (!pengajar) return;

      let query = supabase
        .from("perkembangan_santris")
        .select("*, santris(nama)")
        .eq("teacher_id", pengajar.id)
        .order("tanggal", { ascending: false });

      if (selectedSantri) {
        query = query.eq("student_id", selectedSantri);
      } else if (selectedSesi) {
        const santriIds = santris.map(s => s.id);
        if (santriIds.length > 0) {
          query = query.in("student_id", santriIds);
        }
      }

      if (dateFrom) query = query.gte("tanggal", dateFrom);
      if (dateTo) query = query.lte("tanggal", dateTo);

      const { data } = await query;
      setPerkembangans(data ?? []);
    };
    fetchPerkembangan();
  }, [user, selectedSesi, selectedSantri, dateFrom, dateTo, santris]);

  const handleExportPDF = async () => {
    const groupedBySantri = perkembangans.reduce((acc, p) => {
      const name = p.santris?.nama ?? "Unknown";
      if (!acc[name]) acc[name] = [];
      acc[name].push(p);
      return acc;
    }, {} as Record<string, Perkembangan[]>);

    await createReportPdf({
      filename: `laporan-perkembangan-${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Laporan Perkembangan Santri",
      metadata: [
        `Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`,
        ...(dateFrom || dateTo ? [`Periode: ${dateFrom || "Awal"} - ${dateTo || "Sekarang"}`] : []),
      ],
      tables: Object.entries(groupedBySantri).map(([nama, items]) => ({
        title: nama,
        head: ["Tanggal", "Tipe", "Detail", "Penilaian", "Catatan"],
        body: items.map((item) => [
          formatDateShort(item.tanggal),
          item.tipe_perkembangan,
          item.tipe_perkembangan === "BACAAN" ? (item.jenis_bacaan === "IQRA" ? `Iqra ${item.iqra_ke} Hal. ${item.halaman_iqra}` : `${item.surah} Juz ${item.juz}`) : item.tipe_perkembangan === "HAFALAN" ? item.nama_surah ?? "-" : item.jenis_sholat ?? "-",
          item.penilaian ?? "-",
          item.catatan ?? "-",
        ]),
      })),
      notes: catatanLaporan ? [{ title: "Catatan Pengajar", body: catatanLaporan }] : [],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dokumen" title="Laporan perkembangan" description="Rekap perkembangan santri dengan catatan pengajar." backHref="/pengajar" action={<Button onClick={handleExportPDF} className="h-9 px-4" disabled={perkembangans.length === 0}><Download className="mr-2 h-4 w-4" /> Unduh laporan</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Sesi</Label>
          <Select value={selectedSesi} onValueChange={(v: string | null) => setSelectedSesi(v ?? "")} items={[{ label: "Pagi", value: "PAGI" }, { label: "Sore", value: "SORE" }]}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Semua sesi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Sesi</SelectItem>
              <SelectItem value="PAGI">Pagi</SelectItem>
              <SelectItem value="SORE">Sore</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Santri</Label>
          <Select value={selectedSantri} onValueChange={(v: string | null) => setSelectedSantri(v ?? "")} disabled={!selectedSesi} items={santris.map((s) => ({ label: s.nama, value: s.id }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Semua santri" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Santri</SelectItem>
              {santris.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Dari Tanggal</Label>
          <DatePicker value={dateFrom} onChange={setDateFrom} />
        </div>
        <div className="space-y-2">
          <Label>Sampai Tanggal</Label>
          <DatePicker value={dateTo} onChange={setDateTo} />
        </div>
      </div>

      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Catatan Pengajar</CardTitle>
          {catatanSaved && <span className="text-xs text-green-600">Tersimpan</span>}
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={catatanLaporan}
            onChange={(e) => { setCatatanLaporan(e.target.value); setCatatanSaved(false); }}
            placeholder="Tambahkan catatan pengajar yang akan disertakan dalam laporan..."
            className="min-h-[100px]"
          />
          <Button
            onClick={() => setCatatanSaved(true)}
            className="h-9 px-4"
            disabled={catatanSaved}
          >
            Simpan Catatan
          </Button>
          <p className="text-xs text-muted-foreground">Catatan ini akan disertakan saat laporan diunduh.</p>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Preview Laporan ({perkembangans.length} data)</CardTitle>
        </CardHeader>
        <CardContent>
          {perkembangans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center sm:p-8">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada data untuk dilaporkan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                perkembangans.reduce((acc, p) => {
                  const name = p.santris?.nama ?? "Unknown";
                  if (!acc[name]) acc[name] = [];
                  acc[name].push(p);
                  return acc;
                }, {} as Record<string, Perkembangan[]>)
              ).map(([nama, items]) => (
                <div key={nama} className="rounded-lg border border-border p-4">
                  <h3 className="font-medium text-foreground mb-3">{nama}</h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="w-20 justify-center">
                          {item.tipe_perkembangan === "BACAAN" ? "Bacaan" : item.tipe_perkembangan === "HAFALAN" ? "Hafalan" : "Sholat"}
                        </Badge>
                        <span className="text-muted-foreground">{formatDateShort(item.tanggal)}</span>
                        <span className="flex-1">
                          {item.tipe_perkembangan === "BACAAN"
                            ? (item.jenis_bacaan === "IQRA" ? `Iqra ${item.iqra_ke} Hal. ${item.halaman_iqra}` : `${item.surah} Juz ${item.juz}`)
                            : item.tipe_perkembangan === "HAFALAN" ? item.nama_surah : item.jenis_sholat}
                        </span>
                        {item.penilaian && <Badge variant={item.penilaian === "BAIK" ? "success" : item.penilaian === "CUKUP_BAIK" ? "warning" : "destructive"}>{item.penilaian}</Badge>}
                      </div>
                    ))}
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
