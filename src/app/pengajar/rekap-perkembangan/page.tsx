"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Calendar, BookOpen, BookMarked, Moon } from "lucide-react";
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
  nama_doa: string | null;
  jenis_sholat: string | null;
  penilaian: string | null;
  catatan: string | null;
  santris?: { nama: string };
}

interface Santri { id: string; nama: string; }
interface Group { id: string; nama_group: string; }

export default function RekapPerkembanganPage() {
  const { user } = useAuth();
  const [perkembangans, setPerkembangans] = useState<Perkembangan[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [santris, setSantris] = useState<Santri[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSantri, setSelectedSantri] = useState("");
  const [filterTipe, setFilterTipe] = useState("ALL");
  const [searchDate, setSearchDate] = useState("");
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

      if (filterTipe !== "ALL") {
        query = query.eq("tipe_perkembangan", filterTipe);
      }

      if (searchDate) {
        query = query.eq("tanggal", searchDate);
      }

      const { data } = await query;
      setPerkembangans(data ?? []);
    };
    fetchPerkembangan();
  }, [user, selectedGroup, selectedSantri, filterTipe, searchDate, santris]);

  const getTipeIcon = (tipe: string) => {
    switch (tipe) {
      case "BACAAN": return <BookOpen className="h-4 w-4" />;
      case "HAFALAN": return <BookMarked className="h-4 w-4" />;
      case "PRAKTIK_SHOLAT": return <Moon className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTipeLabel = (item: Perkembangan) => {
    if (item.tipe_perkembangan === "BACAAN") {
      if (item.jenis_bacaan === "IQRA") return `Iqra ${item.iqra_ke} - Hal. ${item.halaman_iqra}`;
      return `${item.surah} (Juz ${item.juz})`;
    }
    if (item.tipe_perkembangan === "HAFALAN") return item.nama_surah;
    return item.jenis_sholat;
  };

  const getPenilaianBadge = (penilaian: string | null) => {
    if (!penilaian) return null;
    const variant = penilaian === "BAIK" ? "success" : penilaian === "CUKUP_BAIK" ? "warning" : "destructive";
    return <Badge variant={variant}>{penilaian === "BAIK" ? "Baik" : penilaian === "CUKUP_BAIK" ? "Cukup Baik" : "Kurang"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pengajar" className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Rekap Perkembangan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Riwayat perkembangan santri yang telah diinput</p>
        </div>
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
          <Label>Tipe</Label>
          <Select value={filterTipe} onValueChange={(v: string | null) => v && setFilterTipe(v)} items={[{ label: "Semua", value: "ALL" }, { label: "Bacaan", value: "BACAAN" }, { label: "Hafalan", value: "HAFALAN" }, { label: "Praktik Sholat", value: "PRAKTIK_SHOLAT" }]}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="BACAAN">Bacaan</SelectItem>
              <SelectItem value="HAFALAN">Hafalan</SelectItem>
              <SelectItem value="PRAKTIK_SHOLAT">Praktik Sholat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tanggal</Label>
          <Input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="h-9" />
        </div>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Riwayat Perkembangan ({perkembangans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {perkembangans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada data perkembangan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {perkembangans.map((p) => (
                <div key={p.id} className="flex items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {getTipeIcon(p.tipe_perkembangan)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{p.santris?.nama}</span>
                      <Badge variant="outline">{p.tipe_perkembangan === "BACAAN" ? "Bacaan" : p.tipe_perkembangan === "HAFALAN" ? "Hafalan" : "Sholat"}</Badge>
                      {getPenilaianBadge(p.penilaian)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{getTipeLabel(p)}</p>
                    {p.catatan && <p className="text-sm text-muted-foreground/70 mt-1 italic">"{p.catatan}"</p>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDateShort(p.tanggal)}
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
