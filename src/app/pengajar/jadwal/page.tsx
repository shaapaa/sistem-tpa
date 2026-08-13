"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { formatHari, formatTime } from "@/lib/format";

interface Jadwal {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
}

export default function PengajarJadwalPage() {
  const { user } = useAuth();
  const [jadwals, setJadwals] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
      if (!pengajar) { setLoading(false); return; }
      const { data } = await supabase
        .from("jadwals")
        .select("id, hari, jam_mulai, jam_selesai")
        .eq("pengajar_id", pengajar.id)
        .order("hari")
        .order("jam_mulai");
      setJadwals(data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const HARI_ORDER = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];
  const sorted = [...jadwals].sort((a, b) => HARI_ORDER.indexOf(a.hari) - HARI_ORDER.indexOf(b.hari));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Jadwal Mengajar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Jadwal mengajar Anda</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada jadwal</p>
        </div>
      ) : (
        <Card className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hari</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sesi</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jam</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((j) => {
                  const sesi = j.jam_mulai.slice(0, 5) === "07:30" ? "Pagi" : "Sore";
                  return (
                    <tr key={j.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{formatHari(j.hari)}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{sesi}</td>
                      <td className="px-4 py-3 text-muted-foreground font-tabular">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(j.jam_mulai)} - {formatTime(j.jam_selesai)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
