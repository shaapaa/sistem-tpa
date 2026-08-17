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
import { Plus, Pencil, Trash2, Search, UserCog, User, UserCheck, Shield, Eye, EyeOff } from "lucide-react"
import { formatRole } from "@/lib/format"
import { PageHeader } from "@/components/layout/page-header"
import { FilterBar } from "@/components/layout/filter-bar"

interface User {
  id: string
  username: string
  role: string
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [search, setSearch] = useState("")
  const [confirmDel, setConfirmDel] = useState<User | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    username: "",
    role: "",
    password: "",
  })
  const supabase = createClient()

  const fetchData = async () => {
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ username: "", role: "PENGAJAR", password: "" })
    setDialogOpen(true)
  }

  const openEdit = (u: User) => {
    setEditing(u)
    setForm({ username: u.username, role: u.role, password: "" })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.username || (!editing && !form.password)) {
      setErrorMsg("Username dan password wajib diisi")
      return
    }
    if (form.password && form.password.length < 6) {
      setErrorMsg("Password minimal 6 karakter")
      return
    }

    const payload = { username: form.username, role: form.role }

    if (editing) {
      const { error: userErr } = await supabase.from("users").update(payload).eq("id", editing.id)
      if (userErr) { setErrorMsg(formatAuthError(userErr.message)); return }
      if (form.password) {
        const { error: pwdErr } = await supabase.auth.admin.updateUserById(editing.id, { password: form.password })
        if (pwdErr) { setErrorMsg(formatAuthError(pwdErr.message)); return }
      }
    } else {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: `${form.username}@tpa-baitulyatama.local`,
        password: form.password,
        email_confirm: true,
      })
      if (authErr) {
        setErrorMsg(formatAuthError(authErr.message))
        return
      }
      if (authUser.user) {
        const { error: userInsertErr } = await supabase.from("users").insert({ id: authUser.user.id, ...payload })
        if (userInsertErr) {
          await supabase.auth.admin.deleteUser(authUser.user.id)
          setErrorMsg(userInsertErr.message.includes("duplicate") || userInsertErr.message.includes("unique")
            ? `Username "${form.username}" sudah digunakan`
            : formatAuthError(userInsertErr.message))
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
    await supabase.auth.admin.deleteUser(id)
    await supabase.from("users").delete().eq("id", id)
    fetchData()
  }

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    ADMIN: Shield,
    PENGAJAR: UserCheck,
    ORANG_TUA: User,
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Akses sistem" title="Users" description="Kelola akun, peran, dan akses masuk sistem." action={<Button onClick={openAdd} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah User
        </Button>} />

      <FilterBar><div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari username..."
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
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Tidak ada user ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatRole(u.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDel(u)}
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
            <DialogTitle>{editing ? "Edit User" : "Tambah User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-9" placeholder="Username" disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v: string | null) => v && setForm({ ...form, role: v })} items={[{ label: "Admin", value: "ADMIN" }, { label: "Pengajar", value: "PENGAJAR" }, { label: "Orang Tua", value: "ORANG_TUA" }]}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="PENGAJAR">Pengajar</SelectItem>
                  <SelectItem value="ORANG_TUA">Orang Tua</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Button onClick={handleSave} className="h-9">{editing ? "Simpan Perubahan" : "Tambah User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Hapus User"
        message={`Hapus user ${confirmDel?.username}?`}
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

function formatAuthError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes("already been registered") || lower.includes("already registered") || lower.includes("duplicate")) {
    return "Username / email sudah digunakan"
  }
  if (lower.includes("invalid") && lower.includes("password")) {
    return "Password tidak valid (minimal 6 karakter)"
  }
  if (lower.includes("not allowed") || lower.includes("forbidden") || lower.includes("unauthorized")) {
    return "Operasi tidak diizinkan. Periksa kembali username — kemungkinan sudah digunakan oleh akun lain."
  }
  return msg
}
