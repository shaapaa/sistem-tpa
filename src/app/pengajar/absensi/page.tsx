"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Users, ClipboardCheck, UserX } from "lucide-react";
import { formatStatus, getStatusBadgeVariant } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface Santri {
  id: string;
  nama: string;
}

interface Group {
  id: string;
  nama_group: string;
}

export default function AbsensiPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [santris, setSantris] = useState<Santri[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
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
      setAttendance({});
    };
    fetchSantris();
  }, [selectedGroup]);

  const handleStatusChange = (studentId: string, status: string | null) => {
    if (status) setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    alert("Fitur simpan absensi akan aktif setelah database setup");
    setSaving(false);
  };

  const hadirCount = Object.values(attendance).filter((s) => s === "HADIR").length;
  const filledCount = Object.keys(attendance).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Absensi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Input kehadiran santri</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Pilih Kelas</Label>
          <Select value={selectedGroup} onValueChange={(v: string | null) => setSelectedGroup(v ?? "")} items={groups.map((g) => ({ label: g.nama_group, value: g.id }))}>
            <SelectTrigger className="w-full max-w-xs h-9">
              <SelectValue placeholder="Pilih kelas" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.nama_group}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedGroup && santris.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="card-elevated">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold tracking-tight font-tabular">{santris.length}</div>
                      <div className="text-xs text-muted-foreground">Total Santri</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <ClipboardCheck className="h-4 w-4 text-green-700" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold tracking-tight font-tabular">{filledCount} <span className="text-sm text-muted-foreground">/ {santris.length}</span></div>
                      <div className="text-xs text-muted-foreground">Sudah Diisi</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {santris.map((s) => {
                    const status = attendance[s.id]
                    return (
                      <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-4 py-3 font-medium text-foreground">{s.nama}</td>
                        <td className="px-4 py-3">
                          {status ? (
                            <Badge variant={getStatusBadgeVariant(status)} className="mr-2">{formatStatus(status)}</Badge>
                          ) : null}
                          <Select
                            value={status ?? ""}
                            onValueChange={(v: string | null) => v && handleStatusChange(s.id, v)}
                            items={[{ label: "Pilih status", value: "" }, { label: "Hadir", value: "HADIR" }, { label: "Izin", value: "IZIN" }, { label: "Sakit", value: "SAKIT" }, { label: "Alpha", value: "ALPHA" }]}
                          >
                            <SelectTrigger className="w-36 h-8">
                              <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HADIR">Hadir</SelectItem>
                              <SelectItem value="IZIN">Izin</SelectItem>
                              <SelectItem value="SAKIT">Sakit</SelectItem>
                              <SelectItem value="ALPHA">Alpha</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Button onClick={handleSave} className="h-9 px-4" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Absensi"}
            </Button>
          </>
        )}

        {selectedGroup && santris.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <UserX className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Tidak ada santri di kelas ini</p>
          </div>
        )}
      </div>
    </div>
  );
}