"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { UserX, Loader2 } from "lucide-react";
import { formatStatus, getStatusBadgeVariant } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";

interface Santri { id: string; nama: string; kelompok_id: string | null }

const DAILY_STATUSES = [
  { label: "Hadir", value: "HADIR" },
  { label: "Izin", value: "IZIN" },
  { label: "Sakit", value: "SAKIT" },
  { label: "Alpha", value: "ALPHA" },
];

export default function PresensiPage() {
  const { user } = useAuth();
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyRows, setDailyRows] = useState<{ santri: Santri; status: string }[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const loadDaily = async () => {
      if (!user || !dailyDate) { setDailyRows([]); return; }
      setDailyLoading(true);
      const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single();
      if (!pengajar) { setDailyLoading(false); return; }

      const { data: kelompokData } = await supabase.from("kelompok").select("id").eq("pengajar_id", pengajar.id);
      const kelompokIds = (kelompokData ?? []).map((k) => k.id);
      if (kelompokIds.length === 0) { setDailyLoading(false); setDailyRows([]); return; }

      const { data: santriData } = await supabase.from("santri").select("id, nama, kelompok_id").in("kelompok_id", kelompokIds).order("nama");
      const santriList = (santriData ?? []) as unknown as Santri[];
      if (santriList.length === 0) { setDailyLoading(false); setDailyRows([]); return; }
      const santriIds = santriList.map((s) => s.id);

      const [presensiRes, bacaanRes, cicilanRes, doaRes, salatRes] = await Promise.all([
        supabase.from("presensi").select("santri_id, status").eq("tanggal", dailyDate).in("santri_id", santriIds),
        supabase.from("perkembangan_bacaan").select("santri_id").eq("tanggal", dailyDate).in("santri_id", santriIds),
        supabase.from("hafalan_surat_cicilan").select("hafalan_santri(santri_id)").eq("tanggal", dailyDate).in("hafalan_santri.santri_id", santriIds),
        supabase.from("perkembangan_hafalan_doa").select("santri_id").eq("tanggal", dailyDate).in("santri_id", santriIds),
        supabase.from("praktik_salat").select("santri_id").eq("tanggal", dailyDate).in("santri_id", santriIds),
      ]);

      const absenMap = new Map<string, string>();
      ;((presensiRes.data ?? []) as unknown as { santri_id: string; status: string }[]).forEach((a) => absenMap.set(a.santri_id, a.status));

      const perkIds = new Set<string>();
      ;((bacaanRes.data ?? []) as unknown as { santri_id: string }[]).forEach((r) => perkIds.add(r.santri_id))
      ;((cicilanRes.data ?? []) as unknown as { hafalan_santri?: { santri_id: string } | null }[]).forEach((r) => { if (r.hafalan_santri?.santri_id) perkIds.add(r.hafalan_santri.santri_id) })
      ;((doaRes.data ?? []) as unknown as { santri_id: string }[]).forEach((r) => perkIds.add(r.santri_id))
      ;((salatRes.data ?? []) as unknown as { santri_id: string }[]).forEach((r) => perkIds.add(r.santri_id))

      const rows = santriList.map((s) => ({
        santri: s,
        status: perkIds.has(s.id) ? "HADIR" : (absenMap.get(s.id) ?? ""),
      }));
      setDailyRows(rows);
      setDailyLoading(false);
    };
    loadDaily();
  }, [user, dailyDate]);

  const handleSetStatus = async (santri: Santri, status: string) => {
    if (!user) return;
    setSavingStatus(santri.id);
    const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single();
    if (!pengajar) { setSavingStatus(null); return; }

    const { error } = await supabase.from("presensi").upsert({
      santri_id: santri.id,
      tanggal: dailyDate,
      status,
      pengajar_id: pengajar.id,
      kelompok_id: santri.kelompok_id,
    }, { onConflict: "santri_id,tanggal" });

    if (!error) {
      setDailyRows((rows) => rows.map((r) => r.santri.id === santri.id ? { ...r, status } : r));
    }
    setSavingStatus(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Kehadiran" title="Presensi harian" description="Semua santri dalam kelompok Anda, lengkap dengan keterangan kehadiran." backHref="/pengajar" />

      <Card className="card-elevated">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Presensi Santri</CardTitle>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tanggal</Label>
            <DatePicker value={dailyDate} onChange={setDailyDate} />
          </div>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
            </div>
          ) : dailyRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center sm:p-8">
              <UserX className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Tidak ada santri pada kelompok Anda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dailyRows.map((row) => (
                <div key={row.santri.id} className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                      {row.santri.nama.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{row.santri.nama}</div>
                      {row.status ? (
                        <Badge variant={getStatusBadgeVariant(row.status)} className="mt-1">{formatStatus(row.status)}</Badge>
                      ) : (
                        <span className="mt-1 inline-block text-xs text-amber-700">Belum diinput</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {DAILY_STATUSES.map((s) => (
                      <button
                        key={s.value}
                        disabled={savingStatus === row.santri.id || row.status === s.value}
                        onClick={() => handleSetStatus(row.santri, s.value)}
                        className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                          row.status === s.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {savingStatus === row.santri.id ? <Loader2 className="h-3 w-3 animate-spin" /> : s.label}
                      </button>
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