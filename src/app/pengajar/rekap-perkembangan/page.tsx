"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Calendar, BookOpen, BookMarked, Moon, HeartHandshake, Pencil, Save } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";

interface Item {
  id: string
  tanggal: string
  tipe: string
  santri_id: string
  detail: string
  status: string | null
  catatan: string | null
  pengajar_id?: string | null
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  LANCAR: "success",
  KURANG_LANCAR: "warning",
  TIDAK_LANCAR: "destructive",
  BUTUH_BIMBINGAN: "warning",
}

type BacaanRow = { id: string; tanggal: string; santri_id: string; pengajar_id: string | null; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null }
type CicilanRow = { id: string; tanggal: string; pengajar_id: string | null; hafalan_santri_id: string; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; hafalan_santri?: { santri_id: string; surat_id: string; surat?: { nama: string } | null } | null }
type DoaRow = { id: string; tanggal: string; santri_id: string; status: string | null; catatan: string | null; doa?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; santri_id: string; status: string | null; catatan: string | null; komponen_salat?: { nama: string } | null }
type PraktikRow = { id: string; tanggal: string; santri_id: string; status: string | null; catatan: string | null; jenis_salat?: { nama: string } | null }
type GerakanSalatRow = { id: string; tanggal: string; santri_id: string; catatan: string | null }
type NiatSalatRow = { id: string; tanggal: string; santri_id: string; status: string; catatan: string | null; jenis_salat?: { nama: string } | null }
type Surat = { id: string; nama: string; juz: number; jumlah_ayat: number }
type BacaanEdit = { id: string; jenis_bacaan: "IQRA" | "QURAN"; jilid: string; halaman: string; surat_id: string; ayat_mulai: string; ayat_selesai: string; status: string; catatan: string }
type HafalanEdit = { id: string; surat_id: string; ayat_mulai: string; ayat_selesai: string; status: string; catatan: string; dapatUbahProgres: boolean }

function statusLabel(s: string | null): string {
  if (!s) return "-"
  const map: Record<string, string> = { LANCAR: "Lancar", KURANG_LANCAR: "Kurang Lancar", TIDAK_LANCAR: "Tidak Lancar", BUTUH_BIMBINGAN: "Butuh Bimbingan" }
  return map[s] ?? s
}

function tipeIcon(tipe: string) {
  if (tipe === "BACAAN") return <BookOpen className="h-4 w-4" />
  if (tipe.includes("HAFALAN")) return <BookMarked className="h-4 w-4" />
  if (tipe.includes("SALAT")) return <Moon className="h-4 w-4" />
  return <HeartHandshake className="h-4 w-4" />
}

export default function RekapPerkembanganPage() {
  const { user } = useAuth();
  const [kelompoks, setKelompoks] = useState<{ id: string; nama: string }[]>([]);
  const [selectedKelompok, setSelectedKelompok] = useState("");
  const [santris, setSantris] = useState<{ id: string; nama: string }[]>([]);
  const [selectedSantri, setSelectedSantri] = useState("");
  const [filterTipe, setFilterTipe] = useState("ALL");
  const [searchDate, setSearchDate] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [santriNames, setSantriNames] = useState<Record<string, string>>({});
  const [pengajarId, setPengajarId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingBacaan, setEditingBacaan] = useState<BacaanEdit | null>(null);
  const [editingHafalan, setEditingHafalan] = useState<HafalanEdit | null>(null);
  const [surats, setSurats] = useState<Surat[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingHafalanEdit, setSavingHafalanEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchKelompok = async () => {
      if (!user) return
      const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
      if (!pengajar) return
      setPengajarId(pengajar.id)
      const { data: k } = await supabase.from("kelompok").select("id, nama").order("nama")
      setKelompoks((k ?? []) as { id: string; nama: string }[])
    }
    fetchKelompok()
  }, [user])

  useEffect(() => {
    const fetchSantris = async () => {
      if (!selectedKelompok) { setSantris([]); return; }
      const { data } = await supabase.from("santri").select("id, nama").eq("kelompok_id", selectedKelompok).eq("is_active", true).order("nama")
      setSantris((data ?? []) as { id: string; nama: string }[])
      setSelectedSantri("")
    }
    fetchSantris()
  }, [selectedKelompok])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
      if (!pengajar) return
      const { data: k } = await supabase.from("kelompok").select("id")
      const kelompokIds = (k ?? []).map((x) => x.id)
      if (kelompokIds.length === 0) { setItems([]); return }
      const { data: santriRes } = await supabase.from("santri").select("id, nama").in("kelompok_id", kelompokIds).eq("is_active", true)
      type SantriRow = { id: string; nama: string }
      const santriRows = (santriRes ?? []) as unknown as SantriRow[]
      const santriIds = santriRows.map((s) => s.id)
      if (santriIds.length === 0) { setItems([]); return }
      const nameMap: Record<string, string> = {}
      santriRows.forEach((s) => { nameMap[s.id] = s.nama })
      setSantriNames(nameMap)

      const build = (tipe: string) => (id: string, tanggal: string, santri_id: string, detail: string, status: string | null, catatan: string | null, pengajar_id?: string | null): Item => ({ id, tanggal, tipe, santri_id, detail, status, catatan, pengajar_id })

      const [bacaan, cicilan, doa, komponen, praktik, gerakan, niat] = await Promise.all([
        supabase.from("perkembangan_bacaan").select("id, tanggal, santri_id, pengajar_id, jenis_bacaan, jilid, halaman, surat_id, juz, status, catatan, surat(nama)").in("santri_id", santriIds),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, pengajar_id, hafalan_santri_id, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(santri_id, surat_id, surat(nama))").in("hafalan_santri.santri_id", santriIds),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, santri_id, status, catatan, doa(nama)").in("santri_id", santriIds),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, santri_id, status, catatan, komponen_salat(nama)").in("santri_id", santriIds),
        supabase.from("praktik_salat").select("id, tanggal, santri_id, status, catatan, jenis_salat(nama)").in("santri_id", santriIds),
        supabase.from("perkembangan_gerakan_salat").select("id, tanggal, santri_id, catatan").in("santri_id", santriIds),
        supabase.from("perkembangan_niat_salat").select("id, tanggal, santri_id, status, catatan, jenis_salat(nama)").in("santri_id", santriIds),
      ])

      const list: Item[] = []
      ;((bacaan.data ?? []) as unknown as BacaanRow[]).forEach((r) => {
        const detail = r.jenis_bacaan === "IQRA" ? `Iqra ${r.jilid} · Hal. ${r.halaman}` : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`
        list.push(build("BACAAN")(r.id, r.tanggal, r.santri_id, detail, r.status, r.catatan, r.pengajar_id))
      })
      ;((cicilan.data ?? []) as unknown as CicilanRow[]).forEach((r) => {
        const sid = r.hafalan_santri?.santri_id ?? ""
        const detail = `${r.hafalan_santri?.surat?.nama ?? "-"} · ayat ${r.ayat_mulai}-${r.ayat_selesai}`
        list.push(build("HAFALAN SURAT")(r.id, r.tanggal, sid, detail, r.status, r.catatan, r.pengajar_id))
      })
      ;((doa.data ?? []) as unknown as DoaRow[]).forEach((r) => list.push(build("HAFALAN DOA")(r.id, r.tanggal, r.santri_id, r.doa?.nama ?? "-", r.status, r.catatan)))
      ;((komponen.data ?? []) as unknown as KomponenRow[]).forEach((r) => list.push(build("SALAT KOMPONEN")(r.id, r.tanggal, r.santri_id, r.komponen_salat?.nama ?? "-", r.status, r.catatan)))
      ;((praktik.data ?? []) as unknown as PraktikRow[]).forEach((r) => list.push(build("PRAKTIK SALAT")(r.id, r.tanggal, r.santri_id, r.jenis_salat?.nama ?? "-", r.status, r.catatan)))
      ;((gerakan.data ?? []) as unknown as GerakanSalatRow[]).forEach((r) => list.push(build("GERAKAN SALAT")(r.id, r.tanggal, r.santri_id, "Penilaian delapan komponen", null, r.catatan)))
      ;((niat.data ?? []) as unknown as NiatSalatRow[]).forEach((r) => list.push(build("NIAT SALAT")(r.id, r.tanggal, r.santri_id, r.jenis_salat?.nama ?? "-", r.status, r.catatan)))

      const filtered = list.filter((it) => {
        if (selectedSantri && selectedSantri !== "ALL" && it.santri_id !== selectedSantri) return false
        if (filterTipe !== "ALL" && it.tipe !== filterTipe) return false
        if (searchDate && it.tanggal !== searchDate) return false
        return true
      }).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
      setItems(filtered)
    }
    fetchData()
  }, [user, selectedSantri, filterTipe, searchDate, refreshKey])

  const openBacaanEditor = async (id: string) => {
    setEditError("")
    const [{ data: bacaan, error }, { data: suratRows, error: suratError }] = await Promise.all([
      supabase.from("perkembangan_bacaan").select("id, jenis_bacaan, jilid, halaman, surat_id, ayat_mulai, ayat_selesai, status, catatan").eq("id", id).single(),
      supabase.from("surat").select("id, nama, juz, jumlah_ayat").eq("aktif", true).order("nomor"),
    ])
    if (error || suratError || !bacaan) {
      setEditError("Data bacaan tidak dapat dibuka. Silakan coba lagi.")
      return
    }
    const row = bacaan as Omit<BacaanEdit, "jilid" | "halaman" | "ayat_mulai" | "ayat_selesai" | "catatan"> & { jilid: number | null; halaman: number | null; ayat_mulai: number | null; ayat_selesai: number | null; catatan: string | null }
    setSurats((suratRows ?? []) as Surat[])
    setEditingBacaan({
      id: row.id,
      jenis_bacaan: row.jenis_bacaan,
      jilid: row.jilid?.toString() ?? "",
      halaman: row.halaman?.toString() ?? "",
      surat_id: row.surat_id ?? "",
      ayat_mulai: row.ayat_mulai?.toString() ?? "",
      ayat_selesai: row.ayat_selesai?.toString() ?? "",
      status: row.status ?? "LANCAR",
      catatan: row.catatan ?? "",
    })
  }

  const saveBacaanEdit = async () => {
    if (!editingBacaan) return
    setEditError("")
    const jilid = Number(editingBacaan.jilid)
    const halaman = Number(editingBacaan.halaman)
    const ayatMulai = Number(editingBacaan.ayat_mulai)
    const ayatSelesai = Number(editingBacaan.ayat_selesai)
    const surat = surats.find((item) => item.id === editingBacaan.surat_id)

    if (editingBacaan.jenis_bacaan === "IQRA" && (!Number.isInteger(jilid) || jilid < 1 || !Number.isInteger(halaman) || halaman < 1)) {
      setEditError("Jilid dan halaman Iqra wajib diisi dengan angka yang valid.")
      return
    }
    if (editingBacaan.jenis_bacaan === "QURAN") {
      if (!surat || !Number.isInteger(ayatMulai) || !Number.isInteger(ayatSelesai) || ayatMulai < 1 || ayatSelesai < ayatMulai) {
        setEditError("Surah serta rentang ayat yang valid wajib diisi.")
        return
      }
      if (ayatSelesai > surat.jumlah_ayat) {
        setEditError(`Ayat melebihi jumlah ayat surah ${surat.nama}.`)
        return
      }
    }

    const payload = editingBacaan.jenis_bacaan === "IQRA"
      ? { jilid, halaman, surat_id: null, juz: null, ayat_mulai: null, ayat_selesai: null, status: editingBacaan.status, catatan: editingBacaan.catatan.trim() || null }
      : { jilid: null, halaman: null, surat_id: surat?.id ?? null, juz: surat?.juz ?? null, ayat_mulai: ayatMulai, ayat_selesai: ayatSelesai, status: editingBacaan.status, catatan: editingBacaan.catatan.trim() || null }

    setSavingEdit(true)
    const { data, error } = await supabase.from("perkembangan_bacaan").update(payload).eq("id", editingBacaan.id).select("id").maybeSingle()
    setSavingEdit(false)
    if (error || !data) {
      setEditError("Perubahan gagal disimpan. Pastikan catatan ini dibuat oleh Anda dan masih berada dalam cakupan sesi Anda.")
      return
    }
    setEditingBacaan(null)
    setRefreshKey((value) => value + 1)
  }

  const openHafalanEditor = async (id: string) => {
    setEditError("")
    const [{ data: cicilan, error }, { data: suratRows, error: suratError }] = await Promise.all([
      supabase.from("hafalan_surat_cicilan").select("id, hafalan_santri_id, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(surat_id)").eq("id", id).single(),
      supabase.from("surat").select("id, nama, juz, jumlah_ayat").eq("aktif", true).order("nomor"),
    ])
    if (error || suratError || !cicilan) {
      setEditError("Data hafalan tidak dapat dibuka. Silakan coba lagi.")
      return
    }
    const row = cicilan as unknown as { id: string; hafalan_santri_id: string; ayat_mulai: number; ayat_selesai: number; status: string | null; catatan: string | null; hafalan_santri?: { surat_id: string } | { surat_id: string }[] | null }
    const hafalanSantri = Array.isArray(row.hafalan_santri) ? row.hafalan_santri[0] : row.hafalan_santri
    const { count, error: countError } = await supabase.from("hafalan_surat_cicilan").select("id", { count: "exact", head: true }).eq("hafalan_santri_id", row.hafalan_santri_id)
    if (countError || !hafalanSantri?.surat_id) {
      setEditError("Riwayat hafalan tidak dapat diverifikasi. Silakan coba lagi.")
      return
    }
    setSurats((suratRows ?? []) as Surat[])
    setEditingHafalan({
      id: row.id,
      surat_id: hafalanSantri.surat_id,
      ayat_mulai: row.ayat_mulai.toString(),
      ayat_selesai: row.ayat_selesai.toString(),
      status: row.status ?? "LANCAR",
      catatan: row.catatan ?? "",
      dapatUbahProgres: count === 1,
    })
  }

  const saveHafalanEdit = async () => {
    if (!editingHafalan) return
    setEditError("")
    const ayatSelesai = Number(editingHafalan.ayat_selesai)
    const surat = surats.find((item) => item.id === editingHafalan.surat_id)
    if (!surat || !Number.isInteger(ayatSelesai) || ayatSelesai < Number(editingHafalan.ayat_mulai) || ayatSelesai > surat.jumlah_ayat) {
      setEditError("Surah dan ayat selesai harus sesuai dengan rentang hafalan yang valid.")
      return
    }

    setSavingHafalanEdit(true)
    const { error } = await supabase.rpc("update_hafalan_surat_cicilan", {
      p_cicilan_id: editingHafalan.id,
      p_surat_id: surat.id,
      p_ayat_selesai: ayatSelesai,
      p_status: editingHafalan.status,
      p_catatan: editingHafalan.catatan.trim() || null,
    })
    setSavingHafalanEdit(false)
    if (error) {
      setEditError(error.message || "Perubahan hafalan gagal disimpan.")
      return
    }
    setEditingHafalan(null)
    setRefreshKey((value) => value + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Riwayat" title="Rekap perkembangan" description="Timeline bacaan, hafalan, dan praktik salat santri." backHref="/pengajar" />

      <div className="teacher-panel-teal grid gap-4 p-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Kelompok</Label>
          <Select value={selectedKelompok} onValueChange={(v) => setSelectedKelompok(v ?? "")} items={kelompoks.map((k) => ({ label: `Kelompok ${k.nama}`, value: k.id }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Semua kelompok" /></SelectTrigger>
            <SelectContent>
              {kelompoks.map((k) => <SelectItem key={k.id} value={k.id}>Kelompok {k.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Santri</Label>
          <Select value={selectedSantri} onValueChange={(v) => setSelectedSantri(v ?? "")} disabled={!selectedKelompok} items={santris.map((s) => ({ label: s.nama, value: s.id }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Semua santri" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Santri</SelectItem>
              {santris.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipe</Label>
          <Select value={filterTipe} onValueChange={(v) => v && setFilterTipe(v)} items={[{ label: "Semua", value: "ALL" }, { label: "Bacaan", value: "BACAAN" }, { label: "Hafalan Surat", value: "HAFALAN SURAT" }, { label: "Hafalan Doa", value: "HAFALAN DOA" }, { label: "Gerakan Salat", value: "GERAKAN SALAT" }, { label: "Niat Salat", value: "NIAT SALAT" }, { label: "Salat Komponen", value: "SALAT KOMPONEN" }, { label: "Praktik Salat", value: "PRAKTIK SALAT" }]}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="BACAAN">Bacaan</SelectItem>
              <SelectItem value="HAFALAN SURAT">Hafalan Surat</SelectItem>
              <SelectItem value="HAFALAN DOA">Hafalan Doa</SelectItem>
              <SelectItem value="GERAKAN SALAT">Gerakan Salat</SelectItem>
              <SelectItem value="NIAT SALAT">Niat Salat</SelectItem>
              <SelectItem value="SALAT KOMPONEN">Salat Komponen</SelectItem>
              <SelectItem value="PRAKTIK SALAT">Praktik Salat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tanggal</Label>
          <DatePicker value={searchDate} onChange={setSearchDate} />
        </div>
      </div>

      <Card className="teacher-panel-violet">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Riwayat Perkembangan ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {editError && !editingBacaan && !editingHafalan && <p className="mb-4 text-sm text-destructive">{editError}</p>}
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center sm:p-8">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada data perkembangan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((p) => (
                <div key={p.id} className="flex items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {tipeIcon(p.tipe)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{santriNames[p.santri_id] ?? "-"}</span>
                      <Badge variant="outline">{p.tipe}</Badge>
                      {p.status && <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>{statusLabel(p.status)}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{p.detail}</p>
                    {p.catatan && <p className="text-sm text-muted-foreground/70 mt-1 italic">&quot;{p.catatan}&quot;</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDateShort(p.tanggal)}
                    </div>
                    {p.tipe === "BACAAN" && p.pengajar_id === pengajarId && (
                      <Button variant="outline" size="sm" onClick={() => openBacaanEditor(p.id)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    {p.tipe === "HAFALAN SURAT" && p.pengajar_id === pengajarId && (
                      <Button variant="outline" size="sm" onClick={() => openHafalanEditor(p.id)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingBacaan)} onOpenChange={(open) => { if (!open) setEditingBacaan(null) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Koreksi perkembangan bacaan</DialogTitle>
            <p className="text-sm text-muted-foreground">Santri dan tanggal pencatatan tidak dapat diubah agar riwayat serta presensi tetap konsisten.</p>
          </DialogHeader>
          {editingBacaan && (
            <div className="space-y-4">
              {editingBacaan.jenis_bacaan === "IQRA" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label htmlFor="edit-jilid">Jilid Iqra</Label><Input id="edit-jilid" type="number" min="1" value={editingBacaan.jilid} onChange={(event) => setEditingBacaan({ ...editingBacaan, jilid: event.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="edit-halaman">Halaman</Label><Input id="edit-halaman" type="number" min="1" value={editingBacaan.halaman} onChange={(event) => setEditingBacaan({ ...editingBacaan, halaman: event.target.value })} /></div>
                </div>
              ) : (
                <>
                  <div className="space-y-2"><Label>Surah</Label><Select value={editingBacaan.surat_id} onValueChange={(value) => setEditingBacaan({ ...editingBacaan, surat_id: value ?? "" })} items={surats.map((surat) => ({ label: surat.nama, value: surat.id }))}><SelectTrigger><SelectValue placeholder="Pilih surah" /></SelectTrigger><SelectContent>{surats.map((surat) => <SelectItem key={surat.id} value={surat.id}>{surat.nama}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="edit-ayat-mulai">Ayat mulai</Label><Input id="edit-ayat-mulai" type="number" min="1" value={editingBacaan.ayat_mulai} onChange={(event) => setEditingBacaan({ ...editingBacaan, ayat_mulai: event.target.value })} /></div>
                    <div className="space-y-2"><Label htmlFor="edit-ayat-selesai">Ayat selesai</Label><Input id="edit-ayat-selesai" type="number" min="1" value={editingBacaan.ayat_selesai} onChange={(event) => setEditingBacaan({ ...editingBacaan, ayat_selesai: event.target.value })} /></div>
                  </div>
                </>
              )}
              <div className="space-y-2"><Label>Status</Label><Select value={editingBacaan.status} onValueChange={(value) => setEditingBacaan({ ...editingBacaan, status: value ?? "LANCAR" })} items={[{ label: "Lancar", value: "LANCAR" }, { label: "Kurang Lancar", value: "KURANG_LANCAR" }, { label: "Tidak Lancar", value: "TIDAK_LANCAR" }]}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LANCAR">Lancar</SelectItem><SelectItem value="KURANG_LANCAR">Kurang Lancar</SelectItem><SelectItem value="TIDAK_LANCAR">Tidak Lancar</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="edit-catatan">Catatan</Label><Textarea id="edit-catatan" value={editingBacaan.catatan} onChange={(event) => setEditingBacaan({ ...editingBacaan, catatan: event.target.value })} placeholder="Tambahkan catatan bila diperlukan" /></div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBacaan(null)} disabled={savingEdit}>Batal</Button>
            <Button onClick={saveBacaanEdit} disabled={savingEdit}>{savingEdit ? "Menyimpan..." : <><Save /> Simpan perubahan</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingHafalan)} onOpenChange={(open) => { if (!open) setEditingHafalan(null) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Koreksi setoran hafalan surat</DialogTitle>
            <p className="text-sm text-muted-foreground">Santri, tanggal, dan ayat mulai tidak dapat diubah agar riwayat setoran tetap konsisten.</p>
          </DialogHeader>
          {editingHafalan && (
            <div className="space-y-4">
              {!editingHafalan.dapatUbahProgres && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Sudah ada setoran lanjutan untuk surah ini. Anda masih dapat memperbaiki status dan catatan, tetapi surah serta ayat selesai dikunci.</p>}
              <div className="space-y-2"><Label>Surah</Label><Select value={editingHafalan.surat_id} disabled={!editingHafalan.dapatUbahProgres} onValueChange={(value) => setEditingHafalan({ ...editingHafalan, surat_id: value ?? "" })} items={surats.map((surat) => ({ label: surat.nama, value: surat.id }))}><SelectTrigger><SelectValue placeholder="Pilih surah" /></SelectTrigger><SelectContent>{surats.map((surat) => <SelectItem key={surat.id} value={surat.id}>{surat.nama}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label htmlFor="edit-hafalan-mulai">Ayat mulai</Label><Input id="edit-hafalan-mulai" type="number" value={editingHafalan.ayat_mulai} disabled /></div>
                <div className="space-y-2"><Label htmlFor="edit-hafalan-selesai">Ayat selesai</Label><Input id="edit-hafalan-selesai" type="number" min={editingHafalan.ayat_mulai} value={editingHafalan.ayat_selesai} disabled={!editingHafalan.dapatUbahProgres} onChange={(event) => setEditingHafalan({ ...editingHafalan, ayat_selesai: event.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Status</Label><Select value={editingHafalan.status} onValueChange={(value) => setEditingHafalan({ ...editingHafalan, status: value ?? "LANCAR" })} items={[{ label: "Lancar", value: "LANCAR" }, { label: "Kurang Lancar", value: "KURANG_LANCAR" }, { label: "Tidak Lancar", value: "TIDAK_LANCAR" }]}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LANCAR">Lancar</SelectItem><SelectItem value="KURANG_LANCAR">Kurang Lancar</SelectItem><SelectItem value="TIDAK_LANCAR">Tidak Lancar</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="edit-hafalan-catatan">Catatan</Label><Textarea id="edit-hafalan-catatan" value={editingHafalan.catatan} onChange={(event) => setEditingHafalan({ ...editingHafalan, catatan: event.target.value })} placeholder="Tambahkan catatan bila diperlukan" /></div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHafalan(null)} disabled={savingHafalanEdit}>Batal</Button>
            <Button onClick={saveHafalanEdit} disabled={savingHafalanEdit}>{savingHafalanEdit ? "Menyimpan..." : <><Save /> Simpan perubahan</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
