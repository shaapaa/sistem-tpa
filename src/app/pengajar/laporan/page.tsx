"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Calendar, BookOpen, BookMarked, Moon } from "lucide-react";
import Link from "next/link";
import { formatDateShort } from "@/lib/format";

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
interface Group { id: string; nama_group: string; }

export default function LaporanPage() {
  const { user } = useAuth();
  const [perkembangans, setPerkembangans] = useState<Perkembangan[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [santris, setSantris] = useState<Santri[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSantri, setSelectedSantri] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [catatanLaporan, setCatatanLaporan] = useState("");
  const [catatanSaved, setCatatanSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
      if (!pengajar) return;
      const { data: gp } = await supabase.from("group_pengajars").select("group_id, groups(id, nama_group)").eq("pengajar_id", pengajar.id);
      setGroups(gp?.map((g: any) => g.groups).filter(Boolean) ?? []);
    };
    fetchGroups();
  }, [user]);

  useEffect(() => {
    const fetchSantris = async () => {
      if (!selectedGroup) { setSantris([]); return; }
      const { data } = await supabase.from("santris").select("id, nama").eq("group_id", selectedGroup).order("nama");
      setSantris(data ?? []);
      setSelectedSantri("");
    };
    fetchSantris();
  }, [selectedGroup]);

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
      } else if (selectedGroup) {
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
  }, [user, selectedGroup, selectedSantri, dateFrom, dateTo, santris]);

  const handleExportPDF = () => {
    const content = generateReportContent();
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-perkembangan-${new Date().toISOString().split("T")[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReportContent = () => {
    const groupedBySantri = perkembangans.reduce((acc, p) => {
      const name = p.santris?.nama ?? "Unknown";
      if (!acc[name]) acc[name] = [];
      acc[name].push(p);
      return acc;
    }, {} as Record<string, Perkembangan[]>);

    let html = `
      <html><head><title>Laporan Perkembangan</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
      </head><body>
      <h1>Laporan Perkembangan Santri</h1>
      <p>Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}</p>
      ${dateFrom || dateTo ? `<p>Periode: ${dateFrom || "Awal"} - ${dateTo || "Sekarang"}</p>` : ""}
      <hr/>
    `;

    for (const [nama, items] of Object.entries(groupedBySantri)) {
      html += `<h2>${nama}</h2><table><tr><th>Tanggal</th><th>Tipe</th><th>Detail</th><th>Penilaian</th><th>Catatan</th></tr>`;
      for (const item of items) {
        const detail = item.tipe_perkembangan === "BACAAN"
          ? (item.jenis_bacaan === "IQRA" ? `Iqra ${item.iqra_ke} Hal. ${item.halaman_iqra}` : `${item.surah} Juz ${item.juz}`)
          : item.tipe_perkembangan === "HAFALAN" ? item.nama_surah : item.jenis_sholat;
        html += `<tr><td>${formatDateShort(item.tanggal)}</td><td>${item.tipe_perkembangan}</td><td>${detail}</td><td>${item.penilaian ?? "-"}</td><td>${item.catatan ?? "-"}</td></tr>`;
      }
      html += `</table>`;
    }

    if (catatanLaporan) {
      html += `<h2>Catatan Pengajar</h2><p>${catatanLaporan.replace(/\n/g, "<br/>")}</p>`;
    }

    html += `</body></html>`;
    return html;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pengajar" className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Laporan Perkembangan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Rekap perkembangan santri yang bisa diunduh</p>
        </div>
        <Button onClick={handleExportPDF} className="h-9 px-4" disabled={perkembangans.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Unduh Laporan
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Kelas</Label>
          <Select value={selectedGroup} onValueChange={(v: string | null) => setSelectedGroup(v ?? "")} items={groups.map((g) => ({ label: g.nama_group, value: g.id }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Semua kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kelas</SelectItem>
              {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.nama_group}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Santri</Label>
          <Select value={selectedSantri} onValueChange={(v: string | null) => setSelectedSantri(v ?? "")} disabled={!selectedGroup} items={santris.map((s) => ({ label: s.nama, value: s.id }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Semua santri" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Santri</SelectItem>
              {santris.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Dari Tanggal</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-2">
          <Label>Sampai Tanggal</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
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
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
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
