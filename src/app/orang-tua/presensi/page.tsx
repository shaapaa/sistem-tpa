"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, CalendarX, Activity, Users, UserX } from "lucide-react";
import { formatDate, formatStatus, getStatusBadgeVariant } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";

type PresensiRow = { id: string; tanggal: string; status: string; keterangan: string | null }

export default function PresensiPage() {
  const { user } = useAuth();
  const [santriId, setSantriId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PresensiRow[]>([]);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const supabase = createClient();

  // Sistem digunakan sejak 2026: tahun 2026 s.d. 5 tahun ke depan
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => 2026 + i), []);

  useEffect(() => {
    const fetchId = async () => {
      if (!user) return;
      const { data: s } = await supabase.from("santri").select("id").eq("profile_id", user.id).single();
      setSantriId(s?.id ?? null);
      setLoading(false);
    };
    fetchId();
  }, [user]);

  useEffect(() => {
    const fetchPresensi = async () => {
      if (!santriId) return;
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const { data } = await supabase
        .from("presensi")
        .select("id, tanggal, status, keterangan")
        .eq("santri_id", santriId)
        .gte("tanggal", start)
        .lte("tanggal", end)
        .order("tanggal", { ascending: false });
      setRecords((data ?? []) as unknown as PresensiRow[]);
    };
    fetchPresensi();
  }, [santriId, month, year]);

  const hadir = records.filter((r) => r.status === "HADIR").length;
  const izin = records.filter((r) => r.status === "IZIN").length;
  const sakit = records.filter((r) => r.status === "SAKIT").length;
  const alpa = records.filter((r) => r.status === "ALPHA").length;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Portal orang tua" title="Presensi" description="Riwayat kehadiran anak." backHref="/orang-tua" />

      {loading ? (
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
      ) : !santriId ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
          <UserX className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Data anak tidak ditemukan</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Bulan</Label>
              <Select value={String(month)} onValueChange={(v) => v && setMonth(parseInt(v))} items={Array.from({ length: 12 }, (_, i) => ({ label: new Date(2000, i, 1).toLocaleDateString("id-ID", { month: "long" }), value: String(i + 1) }))}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{new Date(2000, i, 1).toLocaleDateString("id-ID", { month: "long" })}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Tahun</Label>
              <Select value={String(year)} onValueChange={(v) => v && setYear(parseInt(v))} items={years.map((y) => ({ label: String(y), value: String(y) }))}>
                <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{String(y)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Hadir", value: hadir, color: "text-primary", bg: "bg-primary/10", icon: CalendarCheck },
              { label: "Izin", value: izin, color: "text-amber-700", bg: "bg-amber-100", icon: CalendarX },
              { label: "Sakit", value: sakit, color: "text-amber-700", bg: "bg-amber-100", icon: Activity },
              { label: "Alpa", value: alpa, color: "text-destructive", bg: "bg-red-100", icon: CalendarX },
              { label: "Total", value: records.length, color: "text-primary", bg: "bg-primary/10", icon: Users },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-border p-4 text-center">
                <div className={`mx-auto mb-1 inline-flex rounded-md p-1.5 ${c.bg} ${c.color}`}><c.icon className="h-4 w-4" /></div>
                <p className="font-mono text-2xl font-semibold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>

          <Card className="surface-panel">
            <CardContent className="p-5">
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada presensi pada bulan ini</p>
              ) : (
                <div className="space-y-2">
                  {records.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                      <span className="font-medium text-foreground">{formatDate(r.tanggal)}</span>
                      <div className="flex items-center gap-3">
                        {r.keterangan && <span className="text-sm text-muted-foreground">{r.keterangan}</span>}
                        <Badge variant={getStatusBadgeVariant(r.status)}>{formatStatus(r.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}