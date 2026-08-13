"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Users, Search } from "lucide-react"
import { formatGender } from "@/lib/format"

interface Santri {
  id: string
  nama: string
  jenis_kelamin: string | null
  tanggal_lahir: string | null
  group_id: string
  nama_ayah: string | null
  nama_ibu: string | null
  no_hp_wali: string | null
  pekerjaan_ayah: string | null
  pekerjaan_ibu: string | null
  iuran: number | null
  keterangan: string | null
  pendidikan_saat_ini: string | null
  sesi: string | null
  groups?: { nama_group: string }
}

interface Group {
  id: string
  nama_group: string
  sesi: string | null
}

export default function SantriPage() {
  const [santris, setSantris] = useState<Santri[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Santri | null>(null)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState({
    nama: "",
    jenis_kelamin: "",
    tanggal_lahir: "",
    group_id: "",
    nama_ayah: "",
    nama_ibu: "",
    no_hp_wali: "",
    pekerjaan_ayah: "",
    pekerjaan_ibu: "",
    iuran: "",
    keterangan: "",
    pendidikan_saat_ini: "",
    sesi: "",
  })
  const supabase = createClient()

  const fetchData = async () => {
    const [santriRes, groupRes] = await Promise.all([
      supabase.from("santris").select("*, groups(nama_group, sesi)").order("nama"),
      supabase.from("groups").select("id, nama_group, sesi").order("nama_group"),
    ])
    setSantris(santriRes.data ?? [])
    setGroups(groupRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ nama: "", jenis_kelamin: "", tanggal_lahir: "", group_id: "", nama_ayah: "", nama_ibu: "", no_hp_wali: "", pekerjaan_ayah: "", pekerjaan_ibu: "", iuran: "", keterangan: "", pendidikan_saat_ini: "", sesi: "" })
    setDialogOpen(true)
  }

  const openEdit = (s: Santri) => {
    setEditing(s)
    setForm({
      nama: s.nama,
      jenis_kelamin: s.jenis_kelamin ?? "",
      tanggal_lahir: s.tanggal_lahir ?? "",
      group_id: s.group_id,
      nama_ayah: s.nama_ayah ?? "",
      nama_ibu: s.nama_ibu ?? "",
      no_hp_wali: s.no_hp_wali ?? "",
      pekerjaan_ayah: s.pekerjaan_ayah ?? "",
      pekerjaan_ibu: s.pekerjaan_ibu ?? "",
      iuran: s.iuran?.toString() ?? "",
      keterangan: s.keterangan ?? "",
      pendidikan_saat_ini: s.pendidikan_saat_ini ?? "",
      sesi: s.sesi ?? "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      nama: form.nama,
      jenis_kelamin: form.jenis_kelamin || null,
      tanggal_lahir: form.tanggal_lahir || null,
      group_id: form.group_id,
      nama_ayah: form.nama_ayah || null,
      nama_ibu: form.nama_ibu || null,
      no_hp_wali: form.no_hp_wali || null,
      pekerjaan_ayah: form.pekerjaan_ayah || null,
      pekerjaan_ibu: form.pekerjaan_ibu || null,
      iuran: form.iuran ? parseFloat(form.iuran) : 0,
      keterangan: form.keterangan || null,
      pendidikan_saat_ini: form.pendidikan_saat_ini || null,
      sesi: form.sesi || null,
    }

    if (editing) {
      await supabase.from("santris").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("santris").insert(payload)
    }

    setDialogOpen(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus santri ini?")) return
    await supabase.from("santris").delete().eq("id", id)
    fetchData()
  }

  const filtered = santris.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    s.groups?.nama_group?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Santri</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola data santri TPA</p>
        </div>
        <Button onClick={openAdd} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah Santri
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama atau kelas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="h-32 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Tidak ada santri ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="card-elevated card-elevated-hover cursor-pointer group" onClick={() => openEdit(s)}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">{s.nama.charAt(0)}</div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{s.nama}</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge variant="outline" className="text-[10px]">{s.groups?.nama_group ?? "-"}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{s.sesi === "PAGI" ? "Pagi" : s.sesi === "SORE" ? "Sore" : "-"}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{formatGender(s.jenis_kelamin)}</Badge>
                  {s.keterangan && <Badge variant="secondary" className="text-[10px]">{s.keterangan}</Badge>}
                </div>
                {(s.nama_ayah || s.nama_ibu) && (
                  <p className="text-xs text-muted-foreground">Wali: {s.nama_ayah ?? "-"} / {s.nama_ibu ?? "-"}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Santri" : "Tambah Santri"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="h-9" placeholder="Nama lengkap santri" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <Select value={form.jenis_kelamin} onValueChange={(v: string | null) => setForm({ ...form, jenis_kelamin: v ?? "" })} items={[{ label: "Laki-laki", value: "LAKI_LAKI" }, { label: "Perempuan", value: "PEREMPUAN" }]}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAKI_LAKI">Laki-laki</SelectItem>
                    <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Lahir</Label>
                <Input type="date" value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kelas (Pagi/Sore)</Label>
                <Select value={form.sesi} onValueChange={(v: string | null) => { const sesi = v ?? ""; setForm({ ...form, sesi, group_id: "" }) }} items={[{ label: "Pagi", value: "PAGI" }, { label: "Sore", value: "SORE" }]}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih sesi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAGI">Pagi</SelectItem>
                    <SelectItem value="SORE">Sore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kelas (Detail)</Label>
                <Select value={form.group_id} onValueChange={(v: string | null) => v && setForm({ ...form, group_id: v })} disabled={!form.sesi} items={groups.filter((g) => g.sesi === form.sesi || !form.sesi).map((g) => ({ label: g.nama_group, value: g.id }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>
                    {groups.filter((g) => g.sesi === form.sesi || !form.sesi).map((g) => <SelectItem key={g.id} value={g.id}>{g.nama_group}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pendidikan Saat Ini</Label>
                <Input value={form.pendidikan_saat_ini} onChange={(e) => setForm({ ...form, pendidikan_saat_ini: e.target.value })} className="h-9" placeholder="Contoh: SDN 1 Kelas 3" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keterangan (Jenis Bacaan)</Label>
              <Select value={form.keterangan} onValueChange={(v: string | null) => setForm({ ...form, keterangan: v ?? "" })} items={[{ label: "Iqra", value: "IQRA" }, { label: "Al-Quran", value: "QURAN" }]}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IQRA">Iqra</SelectItem>
                  <SelectItem value="QURAN">Al-Quran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Iuran/Infaq Bulanan</Label>
              <Select value={form.iuran} onValueChange={(v: string | null) => setForm({ ...form, iuran: v ?? "" })} items={[{ label: "Rp 25.000", value: "25000" }, { label: "Rp 50.000", value: "50000" }, { label: "Rp 75.000", value: "75000" }, { label: "Rp 100.000", value: "100000" }]}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih iuran" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25000">Rp 25.000</SelectItem>
                  <SelectItem value="50000">Rp 50.000</SelectItem>
                  <SelectItem value="75000">Rp 75.000</SelectItem>
                  <SelectItem value="100000">Rp 100.000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Ayah</Label>
                <Input value={form.nama_ayah} onChange={(e) => setForm({ ...form, nama_ayah: e.target.value })} className="h-9" placeholder="Nama ayah" />
              </div>
              <div className="space-y-2">
                <Label>Pekerjaan Ayah</Label>
                <Input value={form.pekerjaan_ayah} onChange={(e) => setForm({ ...form, pekerjaan_ayah: e.target.value })} className="h-9" placeholder="Pekerjaan ayah" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Ibu</Label>
                <Input value={form.nama_ibu} onChange={(e) => setForm({ ...form, nama_ibu: e.target.value })} className="h-9" placeholder="Nama ibu" />
              </div>
              <div className="space-y-2">
                <Label>Pekerjaan Ibu</Label>
                <Input value={form.pekerjaan_ibu} onChange={(e) => setForm({ ...form, pekerjaan_ibu: e.target.value })} className="h-9" placeholder="Pekerjaan ibu" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>No. HP Wali</Label>
              <Input value={form.no_hp_wali} onChange={(e) => setForm({ ...form, no_hp_wali: e.target.value })} className="h-9" placeholder="08xx-xxxx-xxxx" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9">Batal</Button>
            <Button onClick={handleSave} className="h-9">{editing ? "Simpan Perubahan" : "Tambah Santri"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
