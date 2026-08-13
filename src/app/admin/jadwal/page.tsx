"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Clock, Users } from "lucide-react";
import { formatHari, formatTime } from "@/lib/format";

interface Jadwal {
  id: string;
  pengajar_id: string | null;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  pengajars?: { nama: string };
}

interface Pengajar {
  id: string;
  nama: string;
}

const HARI_ORDER = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];
const HARI_LABEL: Record<string, string> = {
  SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu",
  KAMIS: "Kamis", JUMAT: "Jumat",
};

const SESI_OPTIONS = [
  { label: "Pagi (07:30 - 10:00)", value: "PAGI" },
  { label: "Sore (16:00 - 17:30)", value: "SORE" },
];

const SESI_JAM: Record<string, { jam_mulai: string; jam_selesai: string }> = {
  PAGI: { jam_mulai: "07:30", jam_selesai: "10:00" },
  SORE: { jam_mulai: "16:00", jam_selesai: "17:30" },
};

export default function JadwalPage() {
  const [jadwals, setJadwals] = useState<Jadwal[]>([]);
  const [pengajars, setPengajars] = useState<Pengajar[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Jadwal | null>(null);
  const [form, setForm] = useState({ pengajar_id: "", hari: "", sesi: "PAGI" });
  const supabase = createClient();

  const fetchData = async () => {
    const [jadwalRes, pengajarRes] = await Promise.all([
      supabase.from("jadwals").select("*, pengajars(nama)").order("jam_mulai"),
      supabase.from("pengajars").select("id, nama").order("nama"),
    ]);
    setJadwals(jadwalRes.data ?? []);
    setPengajars(pengajarRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = (hari?: string) => {
    setEditing(null);
    setForm({ pengajar_id: "", hari: hari ?? "", sesi: "PAGI" });
    setDialogOpen(true);
  };

  const openEdit = (j: Jadwal) => {
    const sesi = j.jam_mulai.slice(0, 5) === "07:30" ? "PAGI" : "SORE";
    setEditing(j);
    setForm({ pengajar_id: j.pengajar_id ?? "", hari: j.hari, sesi });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.pengajar_id || !form.hari) {
      alert("Pengajar dan hari wajib diisi")
      return
    }
    const jam = SESI_JAM[form.sesi];
    const payload = {
      pengajar_id: form.pengajar_id,
      hari: form.hari,
      jam_mulai: jam.jam_mulai,
      jam_selesai: jam.jam_selesai,
    };
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
          <p className="mt-1 text-sm text-muted-foreground">Atur jadwal mengajar pengajar per hari</p>
        </div>
        <Button onClick={() => openAdd()} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah Jadwal
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-9 rounded-lg bg-muted animate-pulse" />
              <div className="h-24 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground leading-tight truncate">
                              {j.pengajars?.nama ?? "-"}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(j.id); }}
                            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
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
              <Label>Pengajar</Label>
              <Select value={form.pengajar_id} onValueChange={(v: string | null) => v && setForm({ ...form, pengajar_id: v })} items={pengajars.map((p) => ({ label: p.nama, value: p.id }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih pengajar" /></SelectTrigger>
                <SelectContent>
                  {pengajars.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
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
            <div className="space-y-2">
              <Label>Sesi</Label>
              <Select value={form.sesi} onValueChange={(v: string | null) => v && setForm({ ...form, sesi: v })} items={SESI_OPTIONS}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESI_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pagi: 07:30 - 10:00 · Sore: 16:00 - 17:30
              </p>
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
