"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { UserX, Loader2 } from "lucide-react";
import { formatStatus, getStatusBadgeVariant } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";

interface Santri { id: string; nama: string; }

const DAILY_STATUSES = [
  { label: "Hadir", value: "HADIR" },
  { label: "Izin", value: "IZIN" },
  { label: "Sakit", value: "SAKIT" },
  { label: "Alpha", value: "ALPHA" },
];

const HARI_MAP = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

export default function PresensiPage() {
  const { user } = useAuth();
  const [dailySesi, setDailySesi] = useState("PAGI");
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyRows, setDailyRows] = useState<{ santri: Santri; status: string }[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const supabase = createClient();

  // Load daily attendance table
  useEffect(() => {
    const loadDaily = async () => {
      if (!user || !dailySesi || !dailyDate) { setDailyRows([]); return; }
      setDailyLoading(true);
      const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
      if (!pengajar) { setDailyLoading(false); return; }

      const { data: santriData } = await supabase.from("santris").select("id, nama").eq("sesi", dailySesi).order("nama");
      const santriList = santriData ?? [];

      const { data: perkData } = await supabase
        .from("perkembangan_santris")
        .select("student_id")
        .eq("teacher_id", pengajar.id)
        .eq("tanggal", dailyDate);
      const perkIds = new Set((perkData ?? []).map((p) => p.student_id));

      const { data: absenData } = await supabase
        .from("absensis")
        .select("student_id, status, pertemuans(tanggal)")
        .eq("teacher_id", pengajar.id);
      type AbsenRow = { student_id: string; status: string; pertemuans: { tanggal: string }[] | null };
      const absenMap = new Map<string, string>();
      ((absenData ?? []) as unknown as AbsenRow[]).forEach((a) => {
        const tanggal = a.pertemuans?.[0]?.tanggal;
        if (tanggal === dailyDate) {
          absenMap.set(a.student_id, a.status);
        }
      });

      const rows = santriList.map((s) => ({
        santri: s,
        status: perkIds.has(s.id) ? "HADIR" : (absenMap.get(s.id) ?? ""),
      }));
      setDailyRows(rows);
      setDailyLoading(false);
    };
    loadDaily();
  }, [user, dailySesi, dailyDate]);

  const ensureMeeting = async (pengajarId: string): Promise<string | null> => {
    const day = HARI_MAP[new Date(`${dailyDate}T00:00:00`).getDay()];
    const sesiPagi = dailySesi === "PAGI";
    const { data: jadwal } = await supabase
      .from("jadwals")
      .select("id, jam_mulai")
      .eq("pengajar_id", pengajarId)
      .eq("hari", day)
      .limit(5);

    type JadwalRow = { id: string; jam_mulai: string };
    const match = ((jadwal ?? []) as JadwalRow[]).find((j) => (sesiPagi ? j.jam_mulai.slice(0, 5) === "07:30" : j.jam_mulai.slice(0, 5) === "16:00"));
    if (!match) return null;

    let { data: pertemuan } = await supabase
      .from("pertemuans")
      .select("id")
      .eq("jadwal_id", match.id)
      .eq("tanggal", dailyDate)
      .maybeSingle();
    if (!pertemuan) {
      const { data: created } = await supabase
        .from("pertemuans")
        .insert({ jadwal_id: match.id, tanggal: dailyDate, status: "SELESAI", created_by: pengajarId })
        .select("id")
        .single();
      pertemuan = created;
    }
    return pertemuan?.id ?? null;
  };

  const handleSetStatus = async (santriId: string, status: string) => {
    if (!user) return;
    setSavingStatus(santriId);
    const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
    if (!pengajar) { setSavingStatus(null); return; }

    const meetingId = await ensureMeeting(pengajar.id);
    if (!meetingId) {
      setSavingStatus(null);
      return;
    }

    const { error } = await supabase.from("absensis").upsert({
      meeting_id: meetingId,
      student_id: santriId,
      teacher_id: pengajar.id,
      status,
    }, { onConflict: "meeting_id,student_id" });

    if (!error) {
      setDailyRows((rows) => rows.map((r) => r.santri.id === santriId ? { ...r, status } : r));
    }
    setSavingStatus(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Kehadiran" title="Presensi harian" description="Semua santri pada sesi terpilih, lengkap dengan keterangan kehadiran." backHref="/pengajar" />

      <Card className="card-elevated">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Presensi Santri · {dailySesi === "PAGI" ? "Sesi Pagi" : "Sesi Sore"}</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Sesi</Label>
              <Select value={dailySesi} onValueChange={(v: string | null) => setDailySesi(v ?? "PAGI")} items={[{ label: "Pagi", value: "PAGI" }, { label: "Sore", value: "SORE" }]}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAGI">Pagi</SelectItem>
                  <SelectItem value="SORE">Sore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Tanggal</Label>
              <DatePicker value={dailyDate} onChange={setDailyDate} />
            </div>
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
              <p className="text-sm text-muted-foreground">Tidak ada santri pada sesi ini</p>
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
                        onClick={() => handleSetStatus(row.santri.id, s.value)}
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
