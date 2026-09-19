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
import { useAuth } from "@/lib/auth-provider"

interface Profile {
  id: string
  nama: string
  role: string
  is_active: boolean | null
  created_at: string
  wali_santri?: { santri_id: string; santri?: { id: string; nama: string } | null }[]
  pengajar?: { id: string; nama: string } | null
}

function normalizeUsername(nama: string): string {
  return nama.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")
}

export default function UsersPage() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [santris, setSantris] = useState<{ id: string; nama: string }[]>([])
  const [pengajars, setPengajars] = useState<{ id: string; nama: string; profile_id: string | null }[]>([])
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
    santri_ids: [] as string[],
    pengajar_id: "",
    is_active: true,
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
    const [profRes, santriRes, pengajarRes] = await Promise.all([
      supabase.from("profiles").select("*, wali_santri(santri_id, santri(id, nama)), pengajar(id, nama)").order("created_at", { ascending: false }),
      supabase.from("santri").select("id, nama").order("nama"),
      supabase.from("pengajar").select("id, nama, profile_id").order("nama"),
    ])
    setProfiles((profRes.data ?? []) as Profile[])
    setSantris(santriRes.data ?? [])
    setPengajars(pengajarRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const loadData = async () => { await fetchData() }
    void loadData()
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ nama: "", role: "PENGAJAR", password: "", santri_ids: [], pengajar_id: "", is_active: true })
    setDialogOpen(true)
  }

  const openEdit = (p: Profile) => {
    setEditing(p)
    setForm({
      nama: p.nama,
      role: p.role,
      password: "",
      santri_ids: p.wali_santri?.map((relasi) => relasi.santri_id) ?? [],
      pengajar_id: p.pengajar?.id ?? "",
      is_active: p.is_active !== false,
    })
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

    if (form.role === "SANTRI" && form.santri_ids.length === 0) {
      setErrorMsg("Pilih santri untuk akun santri")
      return
    }
    if (form.role === "PENGAJAR" && !form.pengajar_id) {
      setErrorMsg("Pilih pengajar untuk akun pengajar")
      return
    }

    if (editing) {
      if (editing.id === user?.id && (form.role !== "ADMIN" || !form.is_active)) {
        setErrorMsg("Admin yang sedang digunakan tidak dapat diubah role atau dinonaktifkan")
        return
      }
      const activeAdminCount = profiles.filter((p) => p.role === "ADMIN" && p.is_active !== false).length
      if (editing.role === "ADMIN" && editing.is_active !== false && (form.role !== "ADMIN" || !form.is_active) && activeAdminCount <= 1) {
        setErrorMsg("Minimal harus ada satu akun admin aktif")
        return
      }
      const { error: profErr } = await supabase.from("profiles").update({ nama: form.nama, role: form.role, is_active: form.is_active }).eq("id", editing.id)
      if (profErr) { setErrorMsg(profErr.message); return }
      if (form.password) {
        try {
          await adminAuth("update", { id: editing.id, password: form.password })
        } catch (err) {
          setErrorMsg((err as Error).message)
          return
        }
      }
      // Kelola relasi wali -> santri (role SANTRI)
      if (form.role !== "SANTRI") {
        const { error } = await supabase.from("wali_santri").delete().eq("profile_id", editing.id)
        if (error) { setErrorMsg(error.message); return }
      } else {
        const currentSantriIds = editing.wali_santri?.map((relasi) => relasi.santri_id) ?? []
        const toAdd = form.santri_ids.filter((id) => !currentSantriIds.includes(id))
        const toRemove = currentSantriIds.filter((id) => !form.santri_ids.includes(id))
        if (toAdd.length > 0) {
          const { error } = await supabase.from("wali_santri").insert(toAdd.map((santri_id) => ({ profile_id: editing.id, santri_id })))
          if (error) { setErrorMsg(error.message); return }
        }
        if (toRemove.length > 0) {
          const { error } = await supabase.from("wali_santri").delete().eq("profile_id", editing.id).in("santri_id", toRemove)
          if (error) { setErrorMsg(error.message); return }
        }
      }
      // Kelola relasi pengajar -> profile (role PENGAJAR)
      if (form.role !== "PENGAJAR") {
        const { error } = await supabase.from("pengajar").update({ profile_id: null }).eq("profile_id", editing.id)
        if (error) { setErrorMsg(error.message); return }
      } else {
        const { error: unlinkErr } = await supabase.from("pengajar").update({ profile_id: null }).eq("profile_id", editing.id)
        if (unlinkErr) { setErrorMsg(unlinkErr.message); return }
        const { error: linkErr } = await supabase.from("pengajar").update({ profile_id: editing.id }).eq("id", form.pengajar_id)
        if (linkErr) { setErrorMsg(linkErr.message); return }
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
      const { error: profInsertErr } = await supabase.from("profiles").insert({ id: authId, nama: form.nama, role: form.role, is_active: form.is_active })
      if (profInsertErr) {
        await adminAuth("delete", { id: authId })
        setErrorMsg(profInsertErr.message.includes("duplicate") || profInsertErr.message.includes("unique")
          ? "Nama / email sudah digunakan"
          : profInsertErr.message)
        return
      }
      if (form.role === "SANTRI" && form.santri_ids.length > 0) {
        const { error: linkErr } = await supabase.from("wali_santri").insert(form.santri_ids.map((santri_id) => ({ profile_id: authId, santri_id })))
        if (linkErr) {
          await supabase.from("profiles").delete().eq("id", authId)
          await adminAuth("delete", { id: authId })
          setErrorMsg("Gagal menghubungkan anak. Coba lagi.")
          return
        }
      }
      if (form.role === "PENGAJAR" && form.pengajar_id) {
        const { error: linkErr } = await supabase.from("pengajar").update({ profile_id: authId }).eq("id", form.pengajar_id)
        if (linkErr) {
          await supabase.from("profiles").delete().eq("id", authId)
          await adminAuth("delete", { id: authId })
          setErrorMsg("Gagal menghubungkan pengajar. Coba lagi.")
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
    if (id === user?.id) { setErrorMsg("Akun admin yang sedang digunakan tidak dapat dihapus"); return }
    const { error: deactivateErr } = await supabase.from("profiles").update({ is_active: false }).eq("id", id)
    if (deactivateErr) { setErrorMsg(deactivateErr.message); return }
    try {
      await adminAuth("delete", { id })
    } catch (err) {
      setErrorMsg(`${(err as Error).message}. Akun telah dinonaktifkan agar tidak dapat digunakan.`)
      fetchData()
      return
    }
    const { error: profDelErr } = await supabase.from("profiles").delete().eq("id", id)
    if (profDelErr) {
      setErrorMsg("Akun login telah dihapus, tetapi profil gagal dibersihkan. Coba hapus profil ini sekali lagi.")
      fetchData()
      return
    }
    fetchData()
  }

  const filtered = profiles.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase())
  )

  const linkedPengajarIds = pengajars.filter((p) => p.profile_id).map((p) => p.id)
  const availablePengajars = pengajars.filter((p) => !linkedPengajarIds.includes(p.id))
  const selectablePengajars = pengajars.filter((p) => !p.profile_id || p.id === form.pengajar_id)

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
                <TableHead>Status</TableHead>
                <TableHead>Terhubung</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                    <TableCell><Badge variant={p.is_active === false ? "destructive" : "secondary"}>{p.is_active === false ? "Nonaktif" : "Aktif"}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.role === "SANTRI"
                        ? <span className="block max-w-56 truncate" title={p.wali_santri?.map((relasi) => relasi.santri?.nama).filter(Boolean).join(", ")}>{p.wali_santri?.map((relasi) => relasi.santri?.nama).filter(Boolean).join(", ") || "-"}</span>
                        : p.pengajar?.nama ?? "-"}
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
              <Select value={form.role} onValueChange={(v: string | null) => v && setForm({ ...form, role: v, santri_ids: [], pengajar_id: "" })} items={[{ label: "Admin", value: "ADMIN" }, { label: "Pengajar", value: "PENGAJAR" }, { label: "Santri", value: "SANTRI" }]} disabled={editing?.id === user?.id}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="PENGAJAR">Pengajar</SelectItem>
                  <SelectItem value="SANTRI">Santri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === "SANTRI" && (
              <div className="space-y-2">
                <Label>Anak yang terhubung</Label>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-input p-2">
                  {santris.map((santri) => {
                    const checked = form.santri_ids.includes(santri.id)
                    return (
                      <label key={santri.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setForm({
                            ...form,
                            santri_ids: checked ? form.santri_ids.filter((id) => id !== santri.id) : [...form.santri_ids, santri.id],
                          })}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span>{santri.nama}</span>
                      </label>
                    )
                  })}
                  {santris.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">Belum ada data santri.</p>}
                </div>
                <p className="text-xs text-muted-foreground">Pilih minimal satu anak untuk akun orang tua/wali.</p>
              </div>
            )}
            {form.role === "PENGAJAR" && (
              <div className="space-y-2">
                <Label>Pengajar</Label>
                <Select
                  value={form.pengajar_id}
                  onValueChange={(v: string | null) => {
                    if (!v) return
                    const pengajar = pengajars.find((p) => p.id === v)
                    setForm({ ...form, pengajar_id: v, nama: pengajar ? pengajar.nama : form.nama })
                  }}
                  items={selectablePengajars.map((p) => ({ label: p.nama, value: p.id }))}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih pengajar" /></SelectTrigger>
                  <SelectContent>
                    {selectablePengajars.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
                {availablePengajars.length === 0 && <p className="text-xs text-muted-foreground">Semua pengajar sudah memiliki akun</p>}
              </div>
            )}
            {editing && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><Label>Status akun</Label><p className="text-xs text-muted-foreground">Akun nonaktif tidak dapat masuk ke sistem.</p></div>
                <Button type="button" variant={form.is_active ? "default" : "outline"} size="sm" disabled={editing.id === user?.id} onClick={() => setForm({ ...form, is_active: !form.is_active })}>
                  {form.is_active ? "Aktif" : "Nonaktif"}
                </Button>
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
