"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, Calendar, Clock, UserX } from "lucide-react";
import { formatGender, formatSesi, formatTingkat } from "@/lib/format";

interface Santri {
  id: string;
  nama: string;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  groups?: { nama_group: string; sesi: string; tingkat: string };
}

export default function OrangTuaDashboard() {
  const { user } = useAuth();
  const [santri, setSantri] = useState<Santri | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: orangTua } = await supabase.from("orang_tuas").select("santri_id").eq("user_id", user.id).single();
      if (!orangTua) { setLoading(false); return; }
      const { data } = await supabase.from("santris").select("*, groups(nama_group, sesi, tingkat)").eq("id", orangTua.santri_id).single();
      setSantri(data);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (!santri) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <UserX className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">Data anak tidak ditemukan</p>
      </div>
    );
  }

  const details = [
    { label: "Kelas", value: santri.groups?.nama_group ?? "-", icon: BookOpen },
    { label: "Sesi", value: formatSesi(santri.groups?.sesi ?? ""), icon: Clock },
    { label: "Tingkat", value: formatTingkat(santri.groups?.tingkat ?? ""), icon: Calendar },
    { label: "Jenis Kelamin", value: formatGender(santri.jenis_kelamin), icon: User },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Orang Tua</h1>
        <p className="mt-1 text-sm text-muted-foreground">Informasi anak Anda</p>
      </div>

      <Card className="card-elevated overflow-hidden">
        <div className="h-1.5 bg-primary/70" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{santri.nama}</CardTitle>
            <Badge variant="outline" className="text-xs">{formatGender(santri.jenis_kelamin)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {details.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.label} className="flex items-start gap-2.5">
                  <div className="mt-0.5 h-8 w-8 shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{d.label}</div>
                    <div className="font-medium text-foreground text-sm mt-0.5">{d.value}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}