"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Users, Search } from "lucide-react"
import { formatGender } from "@/lib/format"
import { PageHeader } from "@/components/layout/page-header"
import { DatePicker } from "@/components/ui/date-picker"
import { FilterBar } from "@/components/layout/filter-bar"

interface Sesi { id: string; nama: string }

interface Kelompok {
  id: string
  nama: string
  sesi_id: string
  sesi?: { nama: string } | null
}

interface Santri {
  id: string
  nama: string
  jenis_kelamin: string | null
  tanggal_lahir: string | null
  kelompok_id: string | null
  alamat: string | null
  nama_ayah: string | null
  nama_ibu: string | null
  no_hp_wali: string | null
  pekerjaan_ayah: string | null
  pekerjaan_ibu: string | null
  iuran: number | null
  keterangan: string | null
  pendidikan_saat_ini: string | null
  kelompok?: { id: string; nama: string; sesi?: { nama: string } | null } | null
}

function kelompokLabel(k: { nama: string; sesi?: { nama: string } | null }): string {
  const sesi = k.sesi?.nama === "PAGI" ? "Pagi" : k.sesi?.nama === "SORE" ? "Sore" : ""
  return sesi ? `${sesi} · Kelompok ${k.nama}` : `Kelompok ${k.nama}`
}

export default function SantriPage() {
  const [santris, setSantris] = useState<Santri[]>([])
  const [sesis, setSesis] = useState<Sesi[]>([])
  const [kelompoks, setKelompoks] = useState<Kelompok[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Santri | null>(null)
  const [search, setSearch] = useState("")
  const [confirmDel, setConfirmDel] = useState<Santri | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [form, setForm] = useState({
    nama: "",
    jenis_kelamin: "",
    tanggal_lahir: "",
    sesi: "",
    keterangan: "",
    alamat: "",
    nama_ayah: "",
    nama_ibu: "",
    no_hp_wali: "",
    pekerjaan_ayah: "",
    pekerjaan_ibu: "",
    iuran: "",
    pendidikan_saat_ini: "",
  })
  const supabase = createClient()

  const fetchData = async () => {
    const [santriRes, sesiRes, kelompokRes] = await Promise.all([
      supabase.from("santri").select("*, kelompok(id, nama, sesi(nama))").order("nama"),
      supabase.from("sesi").select("id, nama").order("nama"),
      supabase.from("kelompok").select("id, nama, sesi_id, sesi(nama)").order("sesi_id").order("nama"),
    ])
    setSantris((santriRes.data ?? []) as unknown as Santri[])
    setSesis((sesiRes.data ?? []) as Sesi[])
    setKelompoks((kelompokRes.data ?? []) as unknown as Kelompok[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // Kelompok otomatis: Iqra -> A, Al-Qur&apos;an -> B, pada sesi terpilih
  const kelompokIdFor = (sesiId: string, bacaan: string): string => {
    const namaKel = bacaan === "IQRA" ? "A" : "B"
    return kelompoks.find((k) => k.sesi_id === sesiId && k.nama === namaKel)?.id ?? ""
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ nama: "", jenis_kelamin: "", tanggal_lahir: "", sesi: "", keterangan: "", alamat: "", nama_ayah: "", nama_ibu: "", no_hp_wali: "", pekerjaan_ayah: "", pekerjaan_ibu: "", iuran: "", pendidikan_saat_ini: "" })
    setDialogOpen(true)
  }

  const openEdit = (s: Santri) => {
    setEditing(s)
    setForm({
      nama: s.nama,
      jenis_kelamin: s.jenis_kelamin ?? "",
      tanggal_lahir: s.tanggal_lahir ?? "",
      sesi: s.kelompok?.sesi?.nama ?? "",
      keterangan: s.keterangan ?? "",
      alamat: s.alamat ?? "",
      nama_ayah: s.nama_ayah ?? "",
      nama_ibu: s.nama_ibu ?? "",
      no_hp_wali: s.no_hp_wali ?? "",
      pekerjaan_ayah: s.pekerjaan_ayah ?? "",
      pekerjaan_ibu: s.pekerjaan_ibu ?? "",
      iuran: s.iuran?.toString() ?? "",
      pendidikan_saat_ini: s.pendidikan_saat_ini ?? "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nama) {
      setErrorMsg("Nama lengkap wajib diisi")
      return
    }
    if (!form.sesi || !form.keterangan) {
      setErrorMsg("Sesi dan jenis bacaan wajib diisi")
      return
    }
    const kelompokId = kelompokIdFor(form.sesi, form.keterangan)
    if (!kelompokId) {
      setErrorMsg("Kelompok untuk sesi dan jenis bacaan ini belum tersedia. Buat di halaman Kelompok.")
      return
    }
    const payload = {
      nama: form.nama,
      jenis_kelamin: form.jenis_kelamin || null,
      tanggal_lahir: form.tanggal_lahir || null,
      kelompok_id: kelompokId,
      keterangan: form.keterangan || null,
      alamat: form.alamat || null,
      nama_ayah: form.nama_ayah || null,
      nama_ibu: form.nama_ibu || null,
      no_hp_wali: form.no_hp_wali || null,
      pekerjaan_ayah: form.pekerjaan_ayah || null,
      pekerjaan_ibu: form.pekerjaan_ibu || null,
      iuran: form.iuran ? parseFloat(form.iuran) : 0,
      pendidikan_saat_ini: form.pendidikan_saat_ini || null,
    }

    if (editing) {
      const { error } = await supabase.from("santri").update(payload).eq("id", editing.id)
      if (error) { setErrorMsg(error.message); return }
    } else {
      const { error } = await supabase.from("santri").insert(payload)
      if (error) { setErrorMsg(error.message); return }
    }

    setDialogOpen(false)
    fetchData()
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    const id = confirmDel.id
    setConfirmDel(null)
    const { error } = await supabase.from("santri").delete().eq("id", id)
    if (error) { setErrorMsg(error.message); return }
    fetchData()
  }

  const filtered = santris.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    (s.kelompok?.nama ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Data inti" title="Santri" description="Kelola identitas santri, sesi, jenis bacaan, wali, dan informasi pendidikan." action={<Button onClick={openAdd} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah Santri
        </Button>} />

      <FilterBar>
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama santri..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>
      </FilterBar>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="h-32 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Tidak ada santri ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="rounded-none border-0 bg-card cursor-pointer group transition-colors hover:bg-primary/[0.025]" onClick={() => openEdit(s)}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">{s.nama.charAt(0)}</div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDel(s); }} className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{s.nama}</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {s.kelompok && <Badge variant="outline" className="text-[10px]">{kelompokLabel(s.kelompok)}</Badge>}
                  <Badge variant="secondary" className="text-[10px]">{s.keterangan === "IQRA" ? "Iqra" : s.keterangan === "QURAN" ? "Al-Qur&apos;an" : "-"}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{formatGender(s.jenis_kelamin)}</Badge>
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
                <DatePicker value={form.tanggal_lahir} onChange={(value) => setForm({ ...form, tanggal_lahir: value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sesi</Label>
                <Select value={form.sesi} onValueChange={(v: string | null) => setForm({ ...form, sesi: v ?? "" })} items={sesis.map((s) => ({ label: s.nama === "PAGI" ? "Pagi" : s.nama === "SORE" ? "Sore" : s.nama, value: s.nama }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih sesi" /></SelectTrigger>
                  <SelectContent>
                    {sesis.map((s) => <SelectItem key={s.id} value={s.nama}>{s.nama === "PAGI" ? "Pagi" : s.nama === "SORE" ? "Sore" : s.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jenis Bacaan</Label>
                <Select value={form.keterangan} onValueChange={(v: string | null) => setForm({ ...form, keterangan: v ?? "" })} items={[{ label: "Iqra", value: "IQRA" }, { label: "Al-Qur&apos;an", value: "QURAN" }]}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IQRA">Iqra</SelectItem>
                    <SelectItem value="QURAN">Al-Qur&apos;an</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Kelompok otomatis: <strong>Iqra → Kelompok A</strong>, <strong>Al-Qur&apos;an → Kelompok B</strong> pada sesi terpilih.
            </p>
            <div className="space-y-2">
              <Label>Pendidikan Saat Ini</Label>
              <Input value={form.pendidikan_saat_ini} onChange={(e) => setForm({ ...form, pendidikan_saat_ini: e.target.value })} className="h-9" placeholder="Contoh: SDN 1 Kelas 3" />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="h-9" placeholder="Alamat tempat tinggal" />
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

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Hapus Santri"
        message={`Hapus santri ${confirmDel?.nama}?`}
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
  )
}