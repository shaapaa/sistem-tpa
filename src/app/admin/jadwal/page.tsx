"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Plus, Trash2, Users } from "lucide-react"
import { formatTime } from "@/lib/format"
import { PageHeader } from "@/components/layout/page-header"

type Sesi = { id: string; nama: string }
type Pengajar = { id: string; nama: string }
type Penugasan = { pengajar_id: string; pengajar?: { nama: string } | null }
type Jadwal = { id: string; sesi_id: string; hari: string; jam_mulai: string; jam_selesai: string; sesi?: Sesi | null; jadwal_sesi_pengajar?: Penugasan[] | null }

const HARI = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"]
const LABEL: Record<string, string> = { SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu", KAMIS: "Kamis", JUMAT: "Jumat", PAGI: "Pagi", SORE: "Sore" }
const JAM: Record<string, [string, string]> = { PAGI: ["08:00", "09:30"], SORE: ["16:00", "17:30"] }

export default function JadwalPage() {
  const supabase = createClient()
  const [jadwals, setJadwals] = useState<Jadwal[]>([])
  const [sesis, setSesis] = useState<Sesi[]>([])
  const [pengajars, setPengajars] = useState<Pengajar[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Jadwal | null>(null)
  const [deleting, setDeleting] = useState<Jadwal | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ sesi_id: "", pengajar_ids: [] as string[], hari: "", jam_mulai: "08:00", jam_selesai: "09:30" })

  const load = async () => {
    const [jadwalRes, sesiRes, pengajarRes] = await Promise.all([
      supabase.from("jadwal_sesi").select("id, sesi_id, hari, jam_mulai, jam_selesai, sesi(id, nama), jadwal_sesi_pengajar(pengajar_id, pengajar(nama))").order("jam_mulai"),
      supabase.from("sesi").select("id, nama").order("nama"),
      supabase.from("pengajar").select("id, nama").order("nama"),
    ])
    setJadwals((jadwalRes.data ?? []) as unknown as Jadwal[])
    setSesis((sesiRes.data ?? []) as Sesi[])
    setPengajars((pengajarRes.data ?? []) as Pengajar[])
    if (jadwalRes.error) setError("Struktur jadwal sesi belum tersedia. Jalankan migrasi 20260922000019 terlebih dahulu.")
    else if (sesiRes.error) setError("Master sesi gagal dimuat.")
    else if (pengajarRes.error) setError("Daftar pengajar gagal dimuat.")
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const chooseSesi = (id: string) => {
    const sesi = sesis.find((item) => item.id === id)
    const [jam_mulai, jam_selesai] = JAM[sesi?.nama ?? ""] ?? ["08:00", "09:30"]
    setForm((value) => ({ ...value, sesi_id: id, jam_mulai, jam_selesai }))
  }
  const togglePengajar = (id: string, checked: boolean) => setForm((value) => ({ ...value, pengajar_ids: (checked ? [...value.pengajar_ids, id] : value.pengajar_ids.filter((item) => item !== id)).slice(0, 3) }))
  const add = (hari = "") => { setEditing(null); setForm({ sesi_id: "", pengajar_ids: [], hari, jam_mulai: "08:00", jam_selesai: "09:30" }); setOpen(true) }
  const edit = (item: Jadwal) => { setEditing(item); setForm({ sesi_id: item.sesi_id, pengajar_ids: (item.jadwal_sesi_pengajar ?? []).map((assignment) => assignment.pengajar_id), hari: item.hari, jam_mulai: item.jam_mulai.slice(0, 5), jam_selesai: item.jam_selesai.slice(0, 5) }); setOpen(true) }
  const save = async () => {
    if (!form.sesi_id || !form.hari || form.pengajar_ids.length === 0) { setError("Sesi, hari, dan minimal satu pengajar wajib dipilih"); return }
    setSaving(true)
    const payload = { sesi_id: form.sesi_id, hari: form.hari, jam_mulai: form.jam_mulai, jam_selesai: form.jam_selesai }
    const scheduleResult = editing ? await supabase.from("jadwal_sesi").update(payload).eq("id", editing.id).select("id").single() : await supabase.from("jadwal_sesi").insert(payload).select("id").single()
    if (scheduleResult.error || !scheduleResult.data) { setError(scheduleResult.error?.message.includes("unique") ? "Sesi sudah memiliki jadwal pada hari ini" : scheduleResult.error?.message ?? "Jadwal gagal disimpan"); setSaving(false); return }
    const jadwalId = scheduleResult.data.id
    const deleteResult = await supabase.from("jadwal_sesi_pengajar").delete().eq("jadwal_sesi_id", jadwalId)
    const assignmentResult = deleteResult.error ? deleteResult : await supabase.from("jadwal_sesi_pengajar").insert(form.pengajar_ids.map((pengajar_id) => ({ jadwal_sesi_id: jadwalId, pengajar_id })))
    if (assignmentResult.error) { setError(assignmentResult.error.message); setSaving(false); return }
    setSaving(false); setOpen(false); void load()
  }
  const remove = async () => { if (!deleting) return; const result = await supabase.from("jadwal_sesi").delete().eq("id", deleting.id); setDeleting(null); if (result.error) setError(result.error.message); else void load() }

  return <div className="space-y-6"><PageHeader eyebrow="Ritme belajar" title="Jadwal sesi" description="Satu jadwal sesi dapat menugaskan hingga tiga pengajar untuk seluruh santri Iqra dan Al-Qur'an pada sesi tersebut." action={<Button onClick={() => add()} className="h-9 px-4"><Plus className="mr-2 h-4 w-4" /> Tambah Jadwal</Button>} />
    {loading ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">{HARI.map((hari) => { const items = jadwals.filter((item) => item.hari === hari); return <section key={hari} className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{LABEL[hari]}</h3><button onClick={() => add(hari)} className="rounded p-1 text-muted-foreground hover:bg-muted"><Plus className="h-4 w-4" /></button></div>{items.map((item) => <Card key={item.id} onClick={() => edit(item)} className="cursor-pointer hover:shadow-md"><CardContent className="p-3"><div className="flex items-start justify-between"><div><p className="flex items-center gap-1.5 text-sm font-medium"><Users className="h-3.5 w-3.5" /> Sesi {LABEL[item.sesi?.nama ?? ""] ?? "-"}</p><p className="mt-1 text-xs text-muted-foreground">{(item.jadwal_sesi_pengajar ?? []).map((assignment) => assignment.pengajar?.nama ?? "-").join(", ") || "Belum ada pengajar"}</p></div><button onClick={(event) => { event.stopPropagation(); setDeleting(item) }} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</p></CardContent></Card>)}{items.length === 0 && <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Kosong</div>}</section> })}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit Jadwal Sesi" : "Tambah Jadwal Sesi"}</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Sesi</Label><Select value={form.sesi_id} onValueChange={(value) => value && chooseSesi(value)} items={sesis.map((item) => ({ label: LABEL[item.nama] ?? item.nama, value: item.id }))}><SelectTrigger><SelectValue placeholder="Pilih sesi" /></SelectTrigger><SelectContent>{sesis.map((item) => <SelectItem key={item.id} value={item.id}>{LABEL[item.nama] ?? item.nama}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Pengajar bertugas (1–3)</Label><div className="space-y-2 rounded-lg border p-3">{pengajars.map((pengajar) => { const checked = form.pengajar_ids.includes(pengajar.id); return <label key={pengajar.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={checked} disabled={!checked && form.pengajar_ids.length >= 3} onChange={(event) => togglePengajar(pengajar.id, event.target.checked)} />{pengajar.nama}</label> })}</div></div><div className="space-y-2"><Label>Hari</Label><Select value={form.hari} onValueChange={(value) => setForm((item) => ({ ...item, hari: value ?? "" }))} items={HARI.map((item) => ({ label: LABEL[item], value: item }))}><SelectTrigger><SelectValue placeholder="Pilih hari" /></SelectTrigger><SelectContent>{HARI.map((item) => <SelectItem key={item} value={item}>{LABEL[item]}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Mulai</Label><Input type="time" value={form.jam_mulai} disabled /></div><div className="space-y-2"><Label>Selesai</Label><Input type="time" value={form.jam_selesai} disabled /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter></DialogContent></Dialog>
    <ConfirmDialog open={!!deleting} onOpenChange={(value) => !value && setDeleting(null)} title="Hapus Jadwal" message="Hapus jadwal sesi beserta seluruh penugasan pengajarnya?" confirmLabel="Hapus" cancelLabel="Batal" variant="destructive" onConfirm={remove} /><ConfirmDialog open={!!error} onOpenChange={(value) => !value && setError("")} title="Perhatian" message={error} confirmLabel="OK" />
  </div>
}
