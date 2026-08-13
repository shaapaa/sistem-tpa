"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, BookMarked, Moon, TrendingUp, Calendar } from "lucide-react";
import { formatDateShort } from "@/lib/format";

interface SantriData {
  id: string;
  nama: string;
  groups?: { nama_group: string };
}

interface Absensi {
  id: string;
  status: string;
  created_at: string;
}

interface Perkembangan {
  id: string;
  tipe_perkembangan: string;
  penilaian: string | null;
  tanggal: string;
}

export default function OrangTuaDashboard() {
  const { user } = useAuth();
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [absensis, setAbsensis] = useState<Absensi[]>([]);
  const [perkembangans, setPerkembangans] = useState<Perkembangan[]>([]);
  const [period, setPeriod] = useState("month");
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Get linked child
      const { data: link } = await supabase
        .from("orang_tuas")
        .select("santri_id, santris(id, nama, groups(nama_group))")
        .eq("user_id", user.id)
        .single();

      if (!link?.santris) return;
      const santriData = link.santris as any;
      setSantri({ id: santriData.id, nama: santriData.nama, groups: santriData.groups });

      // Date filter
      const now = new Date();
      let dateFrom = new Date();
      if (period === "week") dateFrom.setDate(now.getDate() - 7);
      else if (period === "month") dateFrom.setMonth(now.getMonth() - 1);
      else if (period === "quarter") dateFrom.setMonth(now.getMonth() - 3);
      else if (period === "year") dateFrom.setFullYear(now.getFullYear() - 1);

      // Get attendance
      const { data: absen } = await supabase
        .from("absensis")
        .select("id, status, created_at")
        .eq("student_id", link.santri_id)
        .gte("created_at", dateFrom.toISOString())
        .order("created_at", { ascending: false });

      setAbsensis(absen ?? []);

      // Get development
      const { data: perk } = await supabase
        .from("perkembangan_santris")
        .select("id, tipe_perkembangan, penilaian, tanggal")
        .eq("student_id", link.santri_id)
        .gte("tanggal", dateFrom.toISOString().split("T")[0])
        .order("tanggal", { ascending: false });

      setPerkembangans(perk ?? []);
    };

    fetchData();
  }, [user, period]);

  const attendanceRate = absensis.length > 0
    ? Math.round((absensis.filter(a => a.status === "HADIR").length / absensis.length) * 100)
    : 0;

  const bacaanCount = perkembangans.filter(p => p.tipe_perkembangan === "BACAAN").length;
  const hafalanCount = perkembangans.filter(p => p.tipe_perkembangan === "HAFALAN").length;
  const sholatCount = perkembangans.filter(p => p.tipe_perkembangan === "PRAKTIK_SHOLAT").length;

  const goodCount = perkembangans.filter(p => p.penilaian === "BAIK").length;
  const decentCount = perkembangans.filter(p => p.penilaian === "CUKUP_BAIK").length;
  const needsWorkCount = perkembangans.filter(p => p.penilaian === "KURANG").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Rekap perkembangan {santri?.nama ?? "anak Anda"}</p>
        </div>
        <div className="w-48">
          <Label>Periode</Label>
          <Select value={period} onValueChange={(v: string | null) => v && setPeriod(v)} items={[{ label: "Minggu Ini", value: "week" }, { label: "Bulan Ini", value: "month" }, { label: "3 Bulan", value: "quarter" }, { label: "Tahun Ini", value: "year" }]}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="quarter">3 Bulan</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated card-elevated-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kehadiran</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight font-tabular">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{absensis.filter(a => a.status === "HADIR").length} dari {absensis.length} pertemuan</p>
          </CardContent>
        </Card>

        <Card className="card-elevated card-elevated-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bacaan</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600"><BookOpen className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight font-tabular">{bacaanCount}</div>
            <p className="text-xs text-muted-foreground mt-1">catatan perkembangan bacaan</p>
          </CardContent>
        </Card>

        <Card className="card-elevated card-elevated-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hafalan</CardTitle>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600"><BookMarked className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight font-tabular">{hafalanCount}</div>
            <p className="text-xs text-muted-foreground mt-1">surah/doa yang dihafal</p>
          </CardContent>
        </Card>

        <Card className="card-elevated card-elevated-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Praktik Sholat</CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2 text-green-600"><Moon className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight font-tabular">{sholatCount}</div>
            <p className="text-xs text-muted-foreground mt-1">penilaian praktik sholat</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Penilaian Baik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-tabular text-green-600">{goodCount}</div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${perkembangans.length > 0 ? (goodCount / perkembangans.length) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cukup Baik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-tabular text-amber-600">{decentCount}</div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${perkembangans.length > 0 ? (decentCount / perkembangans.length) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Perlu Perbaikan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-tabular text-red-600">{needsWorkCount}</div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${perkembangans.length > 0 ? (needsWorkCount / perkembangans.length) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {perkembangans.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Riwayat Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {perkembangans.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                  <Badge variant="outline" className="w-20 justify-center">
                    {p.tipe_perkembangan === "BACAAN" ? "Bacaan" : p.tipe_perkembangan === "HAFALAN" ? "Hafalan" : "Sholat"}
                  </Badge>
                  <span className="flex-1 text-sm text-muted-foreground">{formatDateShort(p.tanggal)}</span>
                  {p.penilaian && (
                    <Badge variant={p.penilaian === "BAIK" ? "success" : p.penilaian === "CUKUP_BAIK" ? "warning" : "destructive"}>
                      {p.penilaian}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
