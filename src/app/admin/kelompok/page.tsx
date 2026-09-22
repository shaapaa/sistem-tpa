"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"

interface Sesi {
  id: string
  nama: string
}

interface Kelompok {
  id: string
  sesi_id: string
  nama: string
}

const SESI_LABEL: Record<string, string> = { PAGI: "Pagi", SORE: "Sore" }

export default function KelompokPage() {
  const [sesis, setSesis] = useState<Sesi[]>([])
  const [kelompoks, setKelompoks] = useState<Kelompok[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Kelompok | null>(null)
  const [confirmDel, setConfirmDel] = useState<Kelompok | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ sesi_id: "", nama: "A" })
  const supabase = createClient()

  const fetchData = async () => {
    const [sesiRes, kelompokRes] = await Promise.all([
      supabase.from("sesi").select("id, nama").order("nama"),
      supabase.from("kelompok").select("id, sesi_id, nama").order("sesi_id").order("nama"),
    ])
    setSesis(sesiRes.data ?? [])
    setKelompoks(kelompokRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchData() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const openAdd = (sesiId: string) => {
    setEditing(null)
    setForm({ sesi_id: sesiId, nama: "A" })
    setDialogOpen(true)
  }

  const openEdit = (k: Kelompok) => {
    setEditing(k)
    setForm({ sesi_id: k.sesi_id, nama: k.nama })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (saving) return
    if (!form.sesi_id) {
      setErrorMsg("Pilih sesi")
      return
    }
    setSaving(true)
    try {
    const payload = {
      sesi_id: form.sesi_id,
      nama: form.nama,
    }
    if (editing) {
      const { error } = await supabase.from("kelompok").update(payload).eq("id", editing.id)
      if (error) { setErrorMsg(error.message); return }
    } else {
      const { error } = await supabase.from("kelompok").insert(payload)
      if (error) {
        setErrorMsg(error.message.includes("duplicate") || error.message.includes("unique")
          ? "Kelompok ini sudah ada pada sesi tersebut"
          : error.message)
        return
      }
    }
    setDialogOpen(false)
    await fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    const id = confirmDel.id
    setConfirmDel(null)
    const { error } = await supabase.from("kelompok").delete().eq("id", id)
    if (error) { setErrorMsg(error.message); return }
    fetchData()
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Struktur belajar" title="Kelompok" description="Kelola kelompok materi Iqra dan Al-Qur'an. Penugasan pengajar diatur dari Jadwal Sesi." />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-36 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {sesis.map((sesi) => {
            const items = kelompoks.filter((k) => k.sesi_id === sesi.id)
            return (
              <section key={sesi.id} className="surface-panel min-w-0 p-5">
                <div className="flex items-center justify-between">
                  <SectionHeader title={`Sesi ${SESI_LABEL[sesi.nama] ?? sesi.nama}`} description={`${items.length} kelompok`} />
                  <Button variant="outline" size="sm" onClick={() => openAdd(sesi.id)} className="h-8 px-3">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Kelompok
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada kelompok pada sesi ini</p>
                  ) : (
                    items.map((k) => (
                      <Card key={k.id} className="card-elevated">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2 text-primary"><BookOpen className="h-4 w-4" /></div>
                            <div>
                              <p className="font-medium text-foreground">Kelompok {k.nama} <span className="text-xs text-muted-foreground">({k.nama === "A" ? "Iqra" : "Al-Qur'an"})</span></p>
                              <p className="text-xs text-muted-foreground">Materi {k.nama === "A" ? "Iqra" : "Al-Qur'an"}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(k)} className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setConfirmDel(k)} className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kelompok" : "Tambah Kelompok"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sesi</Label>
              <Select value={form.sesi_id} onValueChange={(v: string | null) => v && setForm({ ...form, sesi_id: v })} items={sesis.map((s) => ({ label: SESI_LABEL[s.nama] ?? s.nama, value: s.id }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih sesi" /></SelectTrigger>
                <SelectContent>
                  {sesis.map((s) => <SelectItem key={s.id} value={s.id}>{SESI_LABEL[s.nama] ?? s.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Kelompok</Label>
              <Select value={form.nama} onValueChange={(v: string | null) => v && setForm({ ...form, nama: v })} items={[{ label: "A", value: "A" }, { label: "B", value: "B" }]}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">Pengajar tidak lagi ditetapkan per kelompok. Atur pengajar untuk seluruh sesi melalui menu Jadwal.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="h-9">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-9">{saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Kelompok"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Hapus Kelompok"
        message={`Hapus kelompok ${confirmDel?.nama} pada sesi ini? Santri di dalamnya akan kehilangan kelompok.`}
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
