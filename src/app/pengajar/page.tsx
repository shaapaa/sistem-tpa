"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Calendar, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatHari, formatTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { MetricRail } from "@/components/layout/metric-rail";
import { SectionHeader } from "@/components/layout/section-header";

interface Jadwal {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
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

      // Get jadwals by pengajar
      const { data: jadwalData } = await supabase
        .from("jadwals")
        .select("id, hari, jam_mulai, jam_selesai")
        .eq("pengajar_id", pengajar.id)
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
      <PageHeader eyebrow="Ruang pengajar" title="Hari ini" description="Jadwal dan jumlah santri yang berada dalam tanggung jawab Anda." />
      <MetricRail items={[{ label: "Santri", value: santriCount, detail: "dalam kelas Anda", href: "/pengajar/perkembangan", tone: "primary" }, { label: "Jadwal aktif", value: jadwals.length, detail: "slot mengajar mingguan", href: "/pengajar/jadwal" }]} />
      <section>
        <SectionHeader title="Jadwal mengajar" description="Pilih presensi untuk mulai mencatat pertemuan." actions={<Link href="/pengajar/presensi" className="action-link inline-flex items-center gap-1">Input presensi <ArrowRight className="h-3.5 w-3.5" /></Link>} />

        {jadwals.length === 0 ? (
          <div className="surface-inset mt-4 p-5 text-center sm:p-8">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada jadwal</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border/60 border-y border-border/70">
            {jadwals.map((j) => (
              <div key={j.id} className="flex items-center justify-between px-3 py-4 transition-colors hover:bg-primary/[0.025] sm:px-4">
                <div>
                  <div className="text-sm font-medium text-foreground">{j.jam_mulai.slice(0, 5) === "07:30" ? "Sesi Pagi" : "Sesi Sore"}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{formatHari(j.hari)} · <span className="font-tabular">{formatTime(j.jam_mulai)} - {formatTime(j.jam_selesai)}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
