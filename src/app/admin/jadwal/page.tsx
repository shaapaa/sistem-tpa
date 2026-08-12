"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { formatHari, formatTime } from "@/lib/format";

interface Jadwal {
  id: string;
  group_id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  is_active: boolean;
  groups?: { nama_group: string };
}

interface Group {
  id: string;
  nama_group: string;
}

const HARI_ORDER = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];
const HARI_LABEL: Record<string, string> = {
  SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu",
  KAMIS: "Kamis", JUMAT: "Jumat", SABTU: "Sabtu", MINGGU: "Minggu",
};

export default function JadwalPage() {
  const [jadwals, setJadwals] = useState<Jadwal[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Jadwal | null>(null);
  const [form, setForm] = useState({ group_id: "", hari: "", jam_mulai: "", jam_selesai: "" });
  const supabase = createClient();

  const fetchData = async () => {
    const [jadwalRes, groupRes] = await Promise.all([
      supabase.from("jadwals").select("*, groups(nama_group)").order("jam_mulai"),
      supabase.from("groups").select("id, nama_group").order("nama_group"),
    ]);
    setJadwals(jadwalRes.data ?? []);
    setGroups(groupRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = (hari?: string) => {
    setEditing(null);
    setForm({ group_id: "", hari: hari ?? "", jam_mulai: "", jam_selesai: "" });
    setDialogOpen(true);
  };

  const openEdit = (j: Jadwal) => {
    setEditing(j);
    setForm({ group_id: j.group_id, hari: j.hari, jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { group_id: form.group_id, hari: form.hari, jam_mulai: form.jam_mulai, jam_selesai: form.jam_selesai };
    if (editing) {
      await supabase.from("jadwals").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("jadwals").insert(payload);
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus jadwal ini?")) return;
    await supabase.from("jadwals").delete().eq("id", id);
    fetchData();
  };

  const jadwalByHari = HARI_ORDER.map((hari) => ({
    hari,
    items: jadwals.filter((j) => j.hari === hari),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Jadwal Mengajar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola jadwal TPA per hari</p>
        </div>
        <Button onClick={() => openAdd()} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah Jadwal
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-9 rounded-lg bg-muted animate-pulse" />
              <div className="h-24 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {jadwalByHari.map(({ hari, items }) => (
            <div key={hari} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{HARI_LABEL[hari]}</h3>
                <button
                  onClick={() => openAdd(hari)}
                  className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground/60">Kosong</p>
                  </div>
                ) : (
                  items.map((j) => (
                    <Card
                      key={j.id}
                      className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                      onClick={() => openEdit(j)}
                    >
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="text-sm font-medium text-foreground leading-tight">
                            {j.groups?.nama_group ?? "-"}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(j.id); }}
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground font-tabular">
                          <Clock className="h-3 w-3" />
                          {formatTime(j.jam_mulai)} - {formatTime(j.jam_selesai)}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select value={form.group_id} onValueChange={(v: string | null) => v && setForm({ ...form, group_id: v })} items={groups.map((g) => ({ label: g.nama_group, value: g.id }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.nama_group}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hari</Label>
              <Select value={form.hari} onValueChange={(v: string | null) => v && setForm({ ...form, hari: v })} items={HARI_ORDER.map((h) => ({ label: HARI_LABEL[h], value: h }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih hari" /></SelectTrigger>
                <SelectContent>
                  {HARI_ORDER.map((h) => <SelectItem key={h} value={h}>{HARI_LABEL[h]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jam Mulai</Label>
                <Input type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label>Jam Selesai</Label>
                <Input type="time" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })} className="h-9" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9">Batal</Button>
            <Button onClick={handleSave} className="h-9">{editing ? "Simpan Perubahan" : "Tambah Jadwal"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}