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
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, Eye, EyeOff } from "lucide-react"
import { formatRole } from "@/lib/format"
import { PageHeader } from "@/components/layout/page-header"
import { FilterBar } from "@/components/layout/filter-bar"

interface Profile {
  id: string
  nama: string
  role: string
  is_active: boolean | null
  created_at: string
  santri?: { nama: string } | null
  pengajar?: { nama: string } | null
}

function normalizeUsername(nama: string): string {
  return nama.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [santris, setSantris] = useState<{ id: string; nama: string; profile_id: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [search, setSearch] = useState("")
  const [confirmDel, setConfirmDel] = useState<Profile | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    nama: "",
    role: "",
    password: "",
    santri_id: "",
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
    const [profRes, santriRes] = await Promise.all([
      supabase.from("profiles").select("*, santri(nama), pengajar(nama)").order("created_at", { ascending: false }),
      supabase.from("santri").select("id, nama, profile_id").order("nama"),
    ])
    setProfiles(profRes.data ?? [])
    setSantris(santriRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ nama: "", role: "PENGAJAR", password: "", santri_id: "" })
    setDialogOpen(true)
  }

  const openEdit = (p: Profile) => {
    setEditing(p)
    setForm({ nama: p.nama, role: p.role, password: "", santri_id: p.santri?.nama ? "" : "" })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nama || (!editing && !form.password)) {
      setErrorMsg("Nama dan password wajib diisi")
      return
    }
    if (form.password && form.password.length < 6) {
      setErrorMsg("Password minimal 6 karakter")
      return
    }

    if (!editing && form.role === "SANTRI" && !form.santri_id) {
      setErrorMsg("Pilih santri untuk akun santri")
      return
    }

    if (editing) {
      const { error: profErr } = await supabase.from("profiles").update({ nama: form.nama, role: form.role }).eq("id", editing.id)
      if (profErr) { setErrorMsg(profErr.message); return }
      if (form.password) {
        try {
          await adminAuth("update", { id: editing.id, password: form.password })
        } catch (err) {
          setErrorMsg((err as Error).message)
          return
        }
      }
      // Kelola relasi santri -> profile (role SANTRI)
      if (form.role === "SANTRI") {
        if (form.santri_id) {
          await supabase.from("santri").update({ profile_id: null }).eq("profile_id", editing.id)
          await supabase.from("santri").update({ profile_id: editing.id }).eq("id", form.santri_id)
        }
      } else {
        await supabase.from("santri").update({ profile_id: null }).eq("profile_id", editing.id)
      }
    } else {
      let authId: string
      try {
        const created = await adminAuth("create", {
          email: `${normalizeUsername(form.nama)}@tpa-baitulyatama.local`,
          password: form.password,
        })
        authId = created.id
      } catch (err) {
        setErrorMsg((err as Error).message)
        return
      }
      const { error: profInsertErr } = await supabase.from("profiles").insert({ id: authId, nama: form.nama, role: form.role })
      if (profInsertErr) {
        await adminAuth("delete", { id: authId })
        setErrorMsg(profInsertErr.message.includes("duplicate") || profInsertErr.message.includes("unique")
          ? "Nama / email sudah digunakan"
          : profInsertErr.message)
        return
      }
      if (form.role === "SANTRI" && form.santri_id) {
        const { error: linkErr } = await supabase.from("santri").update({ profile_id: authId }).eq("id", form.santri_id)
        if (linkErr) {
          await supabase.from("profiles").delete().eq("id", authId)
          await adminAuth("delete", { id: authId })
          setErrorMsg("Gagal menghubungkan santri. Coba lagi.")
          return
        }
      }
    }

    setShowPassword(false)
    setDialogOpen(false)
    fetchData()
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    const id = confirmDel.id
    setConfirmDel(null)
    await supabase.from("santri").update({ profile_id: null }).eq("profile_id", id)
    const { error: profDelErr } = await supabase.from("profiles").delete().eq("id", id)
    if (profDelErr) {
      setErrorMsg("Profil terhubung ke data lain. Hapus melalui halaman terkait terlebih dahulu.")
      return
    }
    try {
      await adminAuth("delete", { id })
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
    fetchData()
  }

  const filtered = profiles.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase())
  )

  const linkedSantriIds = santris.filter((s) => s.profile_id).map((s) => s.id)
  const availableSantris = santris.filter((s) => !linkedSantriIds.includes(s.id))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Akses sistem" title="Profil & Akun" description="Kelola akun masuk, peran, dan hubungan ke pengajar/santri." action={<Button onClick={openAdd} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah Akun
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

      <Card className="surface-panel overflow-hidden">
        {loading ? (
          <div className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-muted rounded" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Terhubung</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Tidak ada akun ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nama}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatRole(p.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.santri?.nama ?? p.pengajar?.nama ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDel(p)}
                          className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Akun" : "Tambah Akun"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="h-9" placeholder="Nama akun" disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v: string | null) => v && setForm({ ...form, role: v, santri_id: "" })} items={[{ label: "Admin", value: "ADMIN" }, { label: "Pengajar", value: "PENGAJAR" }, { label: "Santri", value: "SANTRI" }]}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="PENGAJAR">Pengajar</SelectItem>
                  <SelectItem value="SANTRI">Santri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === "SANTRI" && !editing && (
              <div className="space-y-2">
                <Label>Santri</Label>
                <Select
                  value={form.santri_id}
                  onValueChange={(v: string | null) => {
                    if (!v) return
                    const santri = santris.find((s) => s.id === v)
                    setForm({ ...form, santri_id: v, nama: santri ? santri.nama : form.nama })
                  }}
                  items={availableSantris.map((s) => ({ label: s.nama, value: s.id }))}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih santri" /></SelectTrigger>
                  <SelectContent>
                    {availableSantris.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
                {availableSantris.length === 0 && <p className="text-xs text-muted-foreground">Semua santri sudah memiliki akun</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Password {editing ? "(kosongkan jika tidak diubah)" : ""}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-9 pr-10"
                  placeholder={editing ? "Biarkan kosong untuk tidak mengubah" : "Password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9">Batal</Button>
            <Button onClick={handleSave} className="h-9">{editing ? "Simpan Perubahan" : "Tambah Akun"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Hapus Akun"
        message={`Hapus akun ${confirmDel?.nama}?`}
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