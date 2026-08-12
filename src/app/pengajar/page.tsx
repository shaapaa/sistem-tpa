"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatHari, formatTime } from "@/lib/format";

interface Jadwal {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  groups?: { nama_group: string };
}

interface PengajarData {
  id: string;
}

export default function PengajarDashboard() {
  const { user } = useAuth();
  const [jadwals, setJadwals] = useState<Jadwal[]>([]);
  const [santriCount, setSantriCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Get pengajar record
      const { data: pengajar } = await supabase
        .from("pengajars")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!pengajar) return;

      // Get assigned groups
      const { data: groupPengajars } = await supabase
        .from("group_pengajars")
        .select("group_id")
        .eq("pengajar_id", pengajar.id);

      const groupIds = groupPengajars?.map((gp) => gp.group_id) ?? [];
      if (groupIds.length === 0) return;

      // Get jadwals
      const { data: jadwalData } = await supabase
        .from("jadwals")
        .select("*, groups(nama_group)")
        .in("group_id", groupIds)
        .order("hari");

      setJadwals(jadwalData ?? []);

      // Get santri count
      const { count } = await supabase
        .from("santris")
        .select("id", { count: "exact", head: true })
        .in("group_id", groupIds);

      setSantriCount(count ?? 0);
    };

    fetchData();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Pengajar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Jadwal dan jumlah santri Anda</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="card-elevated card-elevated-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Santri Ditangani</CardTitle>
              <p className="text-xs text-muted-foreground/70">Santri pada kelas Anda</p>
            </div>
            <div className="rounded-lg p-2 bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight font-tabular">{santriCount}</div>
          </CardContent>
        </Card>
        <Card className="card-elevated card-elevated-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Jadwal Aktif</CardTitle>
              <p className="text-xs text-muted-foreground/70">Jadwal mingguan Anda</p>
            </div>
            <div className="rounded-lg p-2 bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight font-tabular">{jadwals.length}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Jadwal Mengajar</h2>
          <Link href="/pengajar/absensi" className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-200">
            Input Absensi
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {jadwals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada jadwal</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jadwals.map((j) => (
              <div key={j.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors duration-200">
                <div>
                  <div className="font-medium text-foreground">{j.groups?.nama_group ?? "-"}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{formatHari(j.hari)} · <span className="font-tabular">{formatTime(j.jam_mulai)} - {formatTime(j.jam_selesai)}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}