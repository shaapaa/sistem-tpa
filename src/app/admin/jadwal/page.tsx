"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Clock, Users } from "lucide-react";
import { formatTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";

interface Kelompok {
  id: string
  nama: string
  sesi_id: string
  sesi?: { nama: string } | null
  pengajar?: { nama: string } | null
}

interface Jadwal {
  id: string
  kelompok_id: string
  hari: string
  jam_mulai: string
  jam_selesai: string
  kelompok?: { id: string; nama: string; sesi?: { nama: string } | null; pengajar?: { nama: string } | null } | null
}

const HARI_ORDER = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];
const HARI_LABEL: Record<string, string> = {
  SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu",
  KAMIS: "Kamis", JUMAT: "Jumat",
};
const SESI_JAM: Record<string, { jam_mulai: string; jam_selesai: string }> = {
  PAGI: { jam_mulai: "08:00", jam_selesai: "09:30" },
  SORE: { jam_mulai: "16:00", jam_selesai: "17:30" },
};

function kelompokLabel(k: { nama: string; sesi?: { nama: string } | null }): string {
  const sesi = k.sesi?.nama === "PAGI" ? "Pagi" : k.sesi?.nama === "SORE" ? "Sore" : ""
  return sesi ? `${sesi} · Kelompok ${k.nama}` : `Kelompok ${k.nama}`
}

export default function JadwalPage() {
  const [jadwals, setJadwals] = useState<Jadwal[]>([]);
  const [kelompoks, setKelompoks] = useState<Kelompok[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Jadwal | null>(null);
  const [form, setForm] = useState({ kelompok_id: "", hari: "", jam_mulai: "08:00", jam_selesai: "09:30" });
  const [confirmDel, setConfirmDel] = useState<Jadwal | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchData = async () => {
    const [jadwalRes, kelompokRes] = await Promise.all([
      supabase.from("jadwal").select("*, kelompok(id, nama, sesi(nama), pengajar(nama))").order("jam_mulai"),
      supabase.from("kelompok").select("id, nama, sesi_id, sesi(nama), pengajar(nama)").order("sesi_id").order("nama"),
    ]);
    setJadwals((jadwalRes.data ?? []) as unknown as Jadwal[]);
    setKelompoks((kelompokRes.data ?? []) as unknown as Kelompok[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const applyJam = (kelompokId: string) => {
    const k = kelompoks.find((x) => x.id === kelompokId)
    const sesi = k?.sesi?.nama
    if (sesi && SESI_JAM[sesi]) {
      setForm((f) => ({ ...f, kelompok_id: kelompokId, jam_mulai: SESI_JAM[sesi].jam_mulai, jam_selesai: SESI_JAM[sesi].jam_selesai }))
    } else {
      setForm((f) => ({ ...f, kelompok_id: kelompokId }))
    }
  };

  const openAdd = (hari?: string) => {
    setEditing(null);
    setForm({ kelompok_id: "", hari: hari ?? "", jam_mulai: "08:00", jam_selesai: "09:30" });
    setDialogOpen(true);
  };

  const openEdit = (j: Jadwal) => {
    setEditing(j);
    setForm({ kelompok_id: j.kelompok_id, hari: j.hari, jam_mulai: j.jam_mulai.slice(0, 5), jam_selesai: j.jam_selesai.slice(0, 5) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (saving) return
    if (!form.kelompok_id || !form.hari) {
      setErrorMsg("Kelompok dan hari wajib diisi")
      return
    }
    const sesi = kelompoks.find((kelompok) => kelompok.id === form.kelompok_id)?.sesi?.nama
    const jamSesi = sesi ? SESI_JAM[sesi] : null
    if (!jamSesi) {
      setErrorMsg("Sesi kelompok tidak valid")
      return
    }
    setSaving(true)
    try {
    const payload = {
      kelompok_id: form.kelompok_id,
      hari: form.hari,
      jam_mulai: jamSesi.jam_mulai,
      jam_selesai: jamSesi.jam_selesai,
    };
    if (editing) {
      const { error } = await supabase.from("jadwal").update(payload).eq("id", editing.id)
      if (error) { setErrorMsg(error.message); return }
    } else {
      const { error } = await supabase.from("jadwal").insert(payload)
      if (error) {
        setErrorMsg(error.message.includes("duplicate") || error.message.includes("unique")
          ? "Kelompok sudah memiliki jadwal pada hari ini"
          : error.message)
        return
      }
    }
    setDialogOpen(false);
    await fetchData();
    } finally {
      setSaving(false)
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return
    const id = confirmDel.id
    setConfirmDel(null)
    const { error } = await supabase.from("jadwal").delete().eq("id", id)
    if (error) { setErrorMsg(error.message); return }
    fetchData();
  };

  const jadwalByHari = HARI_ORDER.map((hari) => ({
    hari,
    items: jadwals.filter((j) => j.hari === hari),
  }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Ritme belajar" title="Jadwal kelompok" description="Atur jadwal hari untuk setiap kelompok." action={<Button onClick={() => openAdd()} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah Jadwal
        </Button>} />

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
                            <div className="min-w-0">
                              <span className="block text-sm font-medium text-foreground leading-tight truncate">
                                {j.kelompok ? kelompokLabel(j.kelompok) : "-"}
                              </span>
                              {j.kelompok?.pengajar?.nama && (
                                <span className="block text-xs text-muted-foreground truncate">{j.kelompok.pengajar.nama}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDel(j); }}
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
              <Label>Kelompok</Label>
              <Select value={form.kelompok_id} onValueChange={(v: string | null) => v && applyJam(v)} items={kelompoks.map((k) => ({ label: kelompokLabel(k), value: k.id }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih kelompok" /></SelectTrigger>
                <SelectContent>
                  {kelompoks.map((k) => <SelectItem key={k.id} value={k.id}>{kelompokLabel(k)}</SelectItem>)}
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
                <Input type="time" value={form.jam_mulai} className="h-9" disabled />
              </div>
              <div className="space-y-2">
                <Label>Jam Selesai</Label>
                <Input type="time" value={form.jam_selesai} className="h-9" disabled />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Jam mengikuti sesi kelompok: Pagi 08.00–09.30 · Sore 16.00–17.30.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="h-9">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-9">{saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Jadwal"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Hapus Jadwal"
        message={`Hapus jadwal ini?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={!!errorMsg}
        onOpenChange={(o) => !o && setErrorMsg("")}
        title="Perhatian"
        message={errorMsg}
        confirmLabel="OK"
      />
    </div>
  );
}
