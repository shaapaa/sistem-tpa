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
import { Plus, Pencil, Trash2, Users, Search, GraduationCap } from "lucide-react"
import { formatGender, formatRole } from "@/lib/format"

interface Pengajar {
  id: string
  nama: string
  jenis_kelamin: string | null
  no_hp: string | null
  users?: { id: string; username: string; role: string }
}

export default function PengajarPage() {
  const [pengajars, setPengajars] = useState<Pengajar[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Pengajar | null>(null)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState({
    nama: "",
    jenis_kelamin: "",
    no_hp: "",
    username: "",
    password: "",
  })
  const supabase = createClient()

  const fetchData = async () => {
    const { data } = await supabase
      .from("pengajars")
      .select("*, users(id, username, role)")
      .order("nama")
    setPengajars(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ nama: "", jenis_kelamin: "", no_hp: "", username: "", password: "" })
    setDialogOpen(true)
  }

  const openEdit = (p: Pengajar) => {
    setEditing(p)
    setForm({
      nama: p.nama,
      jenis_kelamin: p.jenis_kelamin ?? "",
      no_hp: p.no_hp ?? "",
      username: p.users?.username ?? "",
      password: "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.username) {
      alert("Username wajib diisi")
      return
    }
    if (!editing && !form.password) {
      alert("Password wajib diisi")
      return
    }

    const payload = {
      nama: form.nama,
      jenis_kelamin: form.jenis_kelamin || null,
      no_hp: form.no_hp || null,
    }

    if (editing) {
      const { error: pengajarErr } = await supabase.from("pengajars").update(payload).eq("id", editing.id)
      if (pengajarErr) { alert(pengajarErr.message); return }

      if (editing.users?.id) {
        await supabase.from("users").update({ username: form.username }).eq("id", editing.users.id)
        if (form.password) {
          await supabase.auth.admin.updateUserById(editing.users.id, { password: form.password })
        }
      }
    } else {
      const { data: newPengajar, error: pengajarErr } = await supabase.from("pengajars").insert(payload).select().single()
      if (pengajarErr) { alert(pengajarErr.message); return }
      if (newPengajar) {
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: `${form.username}@tpa-baitulyatama.local`,
          password: form.password,
          email_confirm: true,
        })
        if (authErr) { alert(authErr.message); return }
        if (authUser.user) {
          await supabase.from("users").insert({
            id: authUser.user.id,
            username: form.username,
            role: "PENGAJAR",
          })
          await supabase.from("pengajars").update({ user_id: authUser.user.id }).eq("id", newPengajar.id)
        }
      }
    }

    setDialogOpen(false)
    fetchData()
  }

  const handleDelete = async (p: Pengajar) => {
    if (!confirm(`Hapus pengajar ${p.nama}?`)) return

    // remove login + linked users row first (user_id FK is RESTRICT, pengajar must still exist)
    if (p.users?.id) {
      await supabase.auth.admin.deleteUser(p.users.id)
      await supabase.from("users").delete().eq("id", p.users.id)
    }

    // cascade deletes group_pengajars, absensis, pertemuans, perkembangan, etc.
    await supabase.from("pengajars").delete().eq("id", p.id)
    fetchData()
  }

  const filtered = pengajars.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase()) ||
    p.users?.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Pengajar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola data pengajar TPA</p>
        </div>
        <Button onClick={openAdd} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah Pengajar
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Tidak ada pengajar ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="card-elevated card-elevated-hover cursor-pointer"
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
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{p.nama}</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge variant="secondary" className="text-[10px]">{formatGender(p.jenis_kelamin)}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.users?.username ?? "-"}</Badge>
                </div>
                {p.no_hp && <p className="text-xs text-muted-foreground">{p.no_hp}</p>}
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
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="h-9" placeholder="Nama lengkap pengajar" />
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
                <Input value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} className="h-9" placeholder="08xx-xxxx-xxxx" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-9" placeholder="Username login" disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>Password {editing ? "(kosongkan jika tidak diubah)" : ""}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-9" placeholder={editing ? "Biarkan kosong untuk tidak mengubah" : "Password login"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9">Batal</Button>
            <Button onClick={handleSave} className="h-9">{editing ? "Simpan Perubahan" : "Tambah Pengajar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}