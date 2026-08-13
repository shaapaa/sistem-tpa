"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Users, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDateShort, formatStatus, getStatusBadgeVariant } from "@/lib/format";

interface Absensi {
  id: string;
  status: string;
  keterangan: string | null;
  created_at: string;
  santris?: { nama: string; groups?: { nama_group: string } };

  pertemuans?: { tanggal: string };
}

interface Santri { id: string; nama: string; }
interface Group { id: string; nama_group: string; }

export default function PresensiPage() {
  const { user } = useAuth();
  const [absensis, setAbsensis] = useState<Absensi[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [santris, setSantris] = useState<Santri[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSantri, setSelectedSantri] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
    const fetchAbsensi = async () => {
      if (!user) return;
      const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
      if (!pengajar) return;

      let query = supabase
        .from("absensis")
        .select("*, santris(nama, groups(nama_group)), pertemuans(tanggal)")
        .eq("teacher_id", pengajar.id)
        .order("created_at", { ascending: false });

      if (selectedSantri) {
        query = query.eq("student_id", selectedSantri);
      } else if (selectedGroup) {
        const santriIds = santris.map(s => s.id);
        if (santriIds.length > 0) {
          query = query.in("student_id", santriIds);
        }
      }

      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo + "T23:59:59");
      }

      const { data } = await query;
      setAbsensis(data ?? []);
    };
    fetchAbsensi();
  }, [user, selectedGroup, selectedSantri, dateFrom, dateTo, santris]);

  const stats = {
    total: absensis.length,
    hadir: absensis.filter(a => a.status === "HADIR").length,
    izin: absensis.filter(a => a.status === "IZIN").length,
    sakit: absensis.filter(a => a.status === "SAKIT").length,
    alpha: absensis.filter(a => a.status === "ALPHA").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pengajar" className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Rekap Presensi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Riwayat kehadiran santri berdasarkan periode</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold font-tabular">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2 text-green-600"><CheckCircle className="h-4 w-4" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Hadir</p>
                <p className="text-2xl font-bold font-tabular text-green-600">{stats.hadir}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600"><Clock className="h-4 w-4" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Izin/Sakit</p>
                <p className="text-2xl font-bold font-tabular text-amber-600">{stats.izin + stats.sakit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2 text-red-600"><XCircle className="h-4 w-4" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Alpha</p>
                <p className="text-2xl font-bold font-tabular text-red-600">{stats.alpha}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
        <CardHeader>
          <CardTitle className="text-sm font-medium">Riwayat Presensi ({absensis.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {absensis.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada data presensi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {absensis.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-foreground">{a.santris?.nama}</div>
                      <div className="text-sm text-muted-foreground">
                        {a.santris?.groups?.nama_group} - {formatDateShort(a.pertemuans?.tanggal ?? "")}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(a.status)}>{formatStatus(a.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
