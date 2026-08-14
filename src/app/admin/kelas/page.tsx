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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Users, BookOpen, Sun, Moon, Calendar } from "lucide-react"
import { formatSesi, formatTingkat } from "@/lib/format"

interface Group {
  id: string
  nama_group: string
  sesi: string
  tingkat: string
  pengajar_id: string | null
  pengajars?: { nama: string }[]
}

interface Pengajar {
  id: string
  nama: string
}

export default function KelasPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [pengajars, setPengajars] = useState<Pengajar[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Group | null>(null)
  const [confirmDel, setConfirmDel] = useState<Group | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [form, setForm] = useState({
    nama_group: "",
    sesi: "PAGI",
    tingkat: "IQRA",
    pengajar_id: "",
  })
  const supabase = createClient()

  const fetchData = async () => {
    const [groupsRes, pengajarsRes] = await Promise.all([
      supabase.from("groups").select("*, group_pengajars(pengajar_id, pengajars(nama))").order("nama_group"),
      supabase.from("pengajars").select("id, nama").order("nama"),
    ])
    setGroups((groupsRes.data ?? []).map((g: any) => ({
      ...g,
      pengajar_id: g.group_pengajars?.[0]?.pengajar_id ?? null,
      pengajars: g.group_pengajars?.[0]?.pengajars ? [g.group_pengajars[0].pengajars] : undefined,
    })))
    setPengajars(pengajarsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ nama_group: "", sesi: "PAGI", tingkat: "IQRA", pengajar_id: "" })
    setDialogOpen(true)
  }

  const openEdit = (g: Group) => {
    setEditing(g)
    setForm({
      nama_group: g.nama_group,
      sesi: g.sesi,
      tingkat: g.tingkat,
      pengajar_id: g.pengajar_id ?? "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nama_group) {
      setErrorMsg("Nama kelas wajib diisi")
      return
    }
    const payload = {
      nama_group: form.nama_group,
      sesi: form.sesi,
      tingkat: form.tingkat,
    }

    let groupId = editing?.id
    if (editing) {
      await supabase.from("groups").update(payload).eq("id", editing.id)
    } else {
      const { data: newGroup } = await supabase.from("groups").insert(payload).select("id").single()
      groupId = newGroup?.id
    }

    // update pengajar assignment via join table
    if (groupId) {
      await supabase.from("group_pengajars").delete().eq("group_id", groupId)
      if (form.pengajar_id) {
        await supabase.from("group_pengajars").insert({ group_id: groupId, pengajar_id: form.pengajar_id })
      }
    }

    setDialogOpen(false)
    fetchData()
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    await supabase.from("group_pengajars").delete().eq("group_id", confirmDel.id)
    await supabase.from("groups").delete().eq("id", confirmDel.id)
    setConfirmDel(null)
    fetchData()
  }

  const sesiOrder = ["PAGI", "SORE"]
  const tingkatOrder = ["IQRA", "QURAN"]

  const sortedGroups = [...groups].sort((a, b) => {
    const sesiDiff = sesiOrder.indexOf(a.sesi) - sesiOrder.indexOf(b.sesi)
    if (sesiDiff !== 0) return sesiDiff
    return tingkatOrder.indexOf(a.tingkat) - tingkatOrder.indexOf(b.tingkat)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Kelas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola kelas dan penempatan pengajar</p>
        </div>
        <Button onClick={openAdd} className="h-9 px-4">
          <Plus className="mr-2 h-4 w-4" /> Tambah Kelas
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {sesiOrder.map((sesi) => (
            <Card key={sesi} className="animate-pulse h-48" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {sesiOrder.map((sesi) => (
            <div key={sesi} className="space-y-4">
              <div className="flex items-center gap-2">
                {sesi === "PAGI" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                <h2 className="font-semibold text-foreground">{formatSesi(sesi)}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedGroups.filter((g) => g.sesi === sesi).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center sm:col-span-2 lg:col-span-3">
                    <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada kelas sesi {formatSesi(sesi).toLowerCase()}</p>
                  </div>
                ) : (
                  sortedGroups.filter((g) => g.sesi === sesi).map((group) => (
                    <Card key={group.id} className="card-elevated card-elevated-hover">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold">{group.nama_group}</CardTitle>
                          <Badge variant="outline" className="text-xs">{formatTingkat(group.tingkat)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span>Pengajar: {group.pengajars?.[0]?.nama ?? "Belum ditetapkan"}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(group)} className="flex-1">
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setConfirmDel(group)} className="flex-1 text-destructive hover:bg-destructive/10">
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                          </Button>
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
            <DialogTitle>{editing ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Kelas</Label>
              <Input value={form.nama_group} onChange={(e) => setForm({ ...form, nama_group: e.target.value })} className="h-9" placeholder="Contoh: IQRA 1 Pagi" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sesi</Label>
                <Select value={form.sesi} onValueChange={(v: string | null) => v && setForm({ ...form, sesi: v })} items={[{ label: "Pagi", value: "PAGI" }, { label: "Sore", value: "SORE" }]}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAGI">Pagi</SelectItem>
                    <SelectItem value="SORE">Sore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tingkat</Label>
                <Select value={form.tingkat} onValueChange={(v: string | null) => v && setForm({ ...form, tingkat: v })} items={[{ label: "IQRA", value: "IQRA" }, { label: "Quran", value: "QURAN" }]}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IQRA">IQRA</SelectItem>
                    <SelectItem value="QURAN">Quran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pengajar (Opsional)</Label>
              <Select value={form.pengajar_id} onValueChange={(v: string | null) => setForm({ ...form, pengajar_id: v ?? "" })} items={[{ label: "Pilih pengajar", value: "" }, ...pengajars.map((p) => ({ label: p.nama, value: p.id }))]}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih pengajar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada</SelectItem>
                  {pengajars.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9">Batal</Button>
            <Button onClick={handleSave} className="h-9">{editing ? "Simpan Perubahan" : "Tambah Kelas"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Hapus Kelas"
        message={`Hapus kelas ${confirmDel?.nama_group}?`}
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
