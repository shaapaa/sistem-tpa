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
import { FilterBar } from "@/components/layout/filter-bar"

interface Pengajar {
  id: string
  nama: string
  jenis_kelamin: string | null
  no_hp: string | null
  alamat: string | null
  profiles?: { id: string; nama: string; role: string } | null
}

export default function PengajarPage() {
  const [pengajars, setPengajars] = useState<Pengajar[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Pengajar | null>(null)
  const [search, setSearch] = useState("")
  const [confirmDel, setConfirmDel] = useState<Pengajar | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nama: "",
    jenis_kelamin: "",
    no_hp: "",
    alamat: "",
  })
  const supabase = createClient()

  const adminAuth = async (action: string, data?: Record<string, unknown>) => {
    const isDelete = action === "delete"
    const url = isDelete && data?.id ? `/api/admin/auth?id=${encodeURIComponent(String(data.id))}` : "/api/admin/auth"
    const res = await fetch(url, {
      method: isDelete ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message || "Operasi gagal")
    return json
  }

  const fetchData = async () => {
    const { data } = await supabase
      .from("pengajar")
      .select("*, profiles(id, nama, role)")
      .order("nama")
    setPengajars(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ nama: "", jenis_kelamin: "", no_hp: "", alamat: "" })
    setDialogOpen(true)
  }

  const openEdit = (p: Pengajar) => {
    setEditing(p)
    setForm({
      nama: p.nama,
      jenis_kelamin: p.jenis_kelamin ?? "",
      no_hp: p.no_hp ?? "",
      alamat: p.alamat ?? "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nama) {
      setErrorMsg("Nama lengkap wajib diisi")
      return
    }

    setSaving(true)
    const payload = {
      nama: form.nama,
      jenis_kelamin: form.jenis_kelamin || null,
      no_hp: form.no_hp || null,
      alamat: form.alamat || null,
    }

    if (editing) {
      const { error: pengajarErr } = await supabase.from("pengajar").update(payload).eq("id", editing.id)
      if (pengajarErr) { setErrorMsg(pengajarErr.message); setSaving(false); return }

      if (editing.profiles?.id) {
        await supabase.from("profiles").update({ nama: form.nama }).eq("id", editing.profiles.id)
      }
    } else {
      const { error: pjErr } = await supabase.from("pengajar").insert(payload)
      if (pjErr) {
        const message = pjErr.message ?? ""
        setErrorMsg(message.includes("duplicate") || message.includes("unique")
          ? `Nama "${form.nama}" sudah digunakan`
          : message || "Gagal menambah pengajar")
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setDialogOpen(false)
    fetchData()
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    const p = confirmDel
    setConfirmDel(null)

    const profileId = p.profiles?.id
    await supabase.from("pengajar").delete().eq("id", p.id)
    if (profileId) {
      await supabase.from("profiles").delete().eq("id", profileId)
      try {
        await adminAuth("delete", { id: profileId })
      } catch (err) {
        setErrorMsg((err as Error).message)
      }
    }
    fetchData()
  }

  const filtered = pengajars.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase()) ||
    p.profiles?.nama?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Manajemen Data" title="Pengajar" description="Kelola data pengajar dan akun login mereka." action={<Button onClick={openAdd} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah Pengajar
        </Button>} />

      <FilterBar><div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      </FilterBar>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Tidak ada pengajar ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="rounded-none border-0 bg-card cursor-pointer group transition-colors hover:bg-primary/[0.025]"
              onClick={() => openEdit(p)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                    {p.nama.charAt(0)}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDel(p); }}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{p.nama}</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge variant="secondary" className="text-[10px]">{formatGender(p.jenis_kelamin)}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.profiles?.nama ?? "tanpa akun"}</Badge>
                </div>
                {p.no_hp && <p className="text-xs text-muted-foreground">{p.no_hp}</p>}
                {p.alamat && <p className="text-xs text-muted-foreground mt-0.5">{p.alamat}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pengajar" : "Tambah Pengajar"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="h-9" placeholder="Nama lengkap pengajar" autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <Select value={form.jenis_kelamin} onValueChange={(v: string | null) => setForm({ ...form, jenis_kelamin: v ?? "" })} items={[{ label: "Pilih", value: "" }, { label: "Laki-laki", value: "LAKI_LAKI" }, { label: "Perempuan", value: "PEREMPUAN" }]}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAKI_LAKI">Laki-laki</SelectItem>
                    <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>No. HP</Label>
                <Input value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} className="h-9" placeholder="08xx-xxxx-xxxx" autoComplete="off" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="h-9" placeholder="Alamat (opsional)" autoComplete="off" />
            </div>
            <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              Akun login (email & password) pengajar dibuat terpisah di menu <strong className="font-medium text-foreground">Profil &amp; Akun</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-9">{saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Pengajar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Hapus Pengajar"
        message={`Hapus pengajar ${confirmDel?.nama} beserta akun loginnya?`}
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