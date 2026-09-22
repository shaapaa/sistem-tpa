"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, UserX } from "lucide-react";
import { formatDate, formatSesi, formatStatus, formatTingkat, getStatusBadgeVariant } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";

type PresensiRow = { id: string; tanggal: string; status: string; keterangan: string | null }
type Santri = { id: string; nama: string; keterangan: string | null; kelompok?: { nama: string; sesi?: { nama: string } | null } | null }

export default function PresensiPage() {
  const { user } = useAuth();
  const [santris, setSantris] = useState<Santri[]>([]);
  const [activeSantriId, setActiveSantriId] = useState<string | null>(null);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<PresensiRow[]>([]);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const supabase = createClient();
  const activeSantri = santris.find((santri) => santri.id === activeSantriId) ?? null;

  // Sistem digunakan sejak 2026: tahun 2026 s.d. 5 tahun ke depan
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => 2026 + i), []);

  useEffect(() => {
    const fetchSantris = async () => {
      if (!user) return;
      setChildrenLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("santri")
        .select("id, nama, keterangan, kelompok(nama, sesi(nama))")
        .order("nama");
      if (error) {
        setError("Data anak tidak dapat dimuat. Silakan coba lagi.");
        setSantris([]);
        setActiveSantriId(null);
      } else {
        const nextSantris = (data ?? []) as unknown as Santri[];
        setSantris(nextSantris);
        setActiveSantriId((currentId) => nextSantris.some((santri) => santri.id === currentId) ? currentId : nextSantris[0]?.id ?? null);
      }
      setChildrenLoading(false);
    };
    fetchSantris();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const fetchPresensi = async () => {
      if (!activeSantriId) {
        setRecords([]);
        return;
      }
      setRecordsLoading(true);
      setError(null);
      setRecords([]);
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("presensi")
        .select("id, tanggal, status, keterangan")
        .eq("santri_id", activeSantriId)
        .gte("tanggal", start)
        .lte("tanggal", end)
        .order("tanggal", { ascending: false });
      if (cancelled) return;
      if (error) {
        setError("Data presensi tidak dapat dimuat. Silakan coba lagi.");
        setRecordsLoading(false);
        return;
      }
      setRecords((data ?? []) as unknown as PresensiRow[]);
      setRecordsLoading(false);
    };
    fetchPresensi();
    return () => { cancelled = true; };
  }, [activeSantriId, month, year]);

  const hadir = records.filter((r) => r.status === "HADIR").length;
  const izin = records.filter((r) => r.status === "IZIN").length;
  const sakit = records.filter((r) => r.status === "SAKIT").length;
  const alpa = records.filter((r) => r.status === "ALPHA").length;

  const total = records.length;
  const attendanceRate = total > 0 ? Math.round((hadir / total) * 100) : 0;
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const segments = [
    { label: "Hadir", value: hadir, color: "bg-emerald-500" },
    { label: "Izin", value: izin, color: "bg-amber-400" },
    { label: "Sakit", value: sakit, color: "bg-orange-500" },
    { label: "Alpa", value: alpa, color: "bg-rose-500" },
  ];

  if (childrenLoading) return <div className="h-32 rounded-lg bg-muted animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portal orang tua"
        title="Presensi"
        description={activeSantri ? `Riwayat kehadiran ${activeSantri.nama}.` : "Riwayat kehadiran anak."}
        backHref="/orang-tua"
        action={santris.length > 1 ? (
          <div className="w-44">
            <Label className="text-[10px] text-muted-foreground">Pilih Anak</Label>
            <Select value={activeSantriId} onValueChange={(value: string | null) => value && setActiveSantriId(value)} items={santris.map((santri) => ({ label: santri.nama, value: santri.id }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {santris.map((santri) => <SelectItem key={santri.id} value={santri.id}>{santri.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : undefined}
      />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center sm:p-12">
          <UserX className="mx-auto h-10 w-10 text-destructive/60 mb-3" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : santris.length === 0 || !activeSantri ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
          <UserX className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada data anak yang terhubung dengan akun ini.</p>
        </div>
      ) : (
        <>
          <section className="surface-panel p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Kehadiran anak</p><p className="mt-1 text-lg font-semibold text-foreground">{activeSantri.nama}</p><p className="mt-1 text-sm text-muted-foreground">Kelompok {activeSantri.kelompok?.nama ?? "-"}{activeSantri.keterangan ? ` · ${formatTingkat(activeSantri.keterangan)}` : ""} · Sesi {formatSesi(activeSantri.kelompok?.sesi?.nama ?? "-")}</p></div><p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">Periode {monthLabel}</p></div></section>

          {recordsLoading ? <div className="space-y-3"><div className="h-48 animate-pulse rounded-xl bg-muted" /><div className="h-32 animate-pulse rounded-xl bg-muted" /></div> : <>
          <section className="surface-panel p-5 sm:p-6"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Kehadiran</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><p className="text-4xl font-semibold tracking-tight text-foreground">{total > 0 ? `${attendanceRate}%` : "-"}</p><p className="mt-1 text-sm text-muted-foreground">{total > 0 ? `Hadir ${hadir} dari ${total} pertemuan` : "Belum ada pertemuan pada periode ini"}</p></div><CalendarCheck className="h-9 w-9 text-emerald-600" /></div>{total > 0 && <><div className="mt-5 flex h-2 overflow-hidden rounded-full bg-muted">{segments.map((segment) => segment.value > 0 && <span key={segment.label} className={segment.color} style={{ width: `${(segment.value / total) * 100}%` }} />)}</div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">{segments.slice(1).map((segment) => <span key={segment.label} className="text-muted-foreground"><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${segment.color}`} />{segment.label} {segment.value}</span>)}</div></>}</section>

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

          <Card className="surface-panel">
            <CardContent className="p-5">
              {records.length === 0 ? (
                <EmptyState message={`Belum ada presensi pada ${monthLabel}.`} hint="Pilih bulan lain untuk melihat riwayat kehadiran." />
              ) : (
                <div className="space-y-2">
                  {records.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-foreground">{formatDate(r.tanggal)}</span><Badge variant={getStatusBadgeVariant(r.status)}>{formatStatus(r.status)}</Badge></div>{r.keterangan && <p className="mt-2 text-sm text-muted-foreground">{r.keterangan}</p>}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </>}
        </>
      )}
    </div>
  );
}
