"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, BookOpen, BookMarked, Moon, HeartHandshake } from "lucide-react";
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
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  LANCAR: "success",
  KURANG_LANCAR: "warning",
  TIDAK_LANCAR: "destructive",
  BUTUH_BIMBINGAN: "warning",
}

type BacaanRow = { id: string; tanggal: string; santri_id: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null }
type CicilanRow = { id: string; tanggal: string; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; hafalan_santri?: { santri_id: string; surat?: { nama: string } | null } | null }
type DoaRow = { id: string; tanggal: string; santri_id: string; status: string | null; catatan: string | null; doa?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; santri_id: string; status: string | null; catatan: string | null; komponen_salat?: { nama: string } | null }
type PraktikRow = { id: string; tanggal: string; santri_id: string; status: string | null; catatan: string | null; jenis_salat?: { nama: string } | null }
type GerakanSalatRow = { id: string; tanggal: string; santri_id: string; catatan: string | null }
type NiatSalatRow = { id: string; tanggal: string; santri_id: string; status: string; catatan: string | null; jenis_salat?: { nama: string } | null }

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
  const supabase = createClient();

  useEffect(() => {
    const fetchKelompok = async () => {
      if (!user) return
      const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
      if (!pengajar) return
      const { data: k } = await supabase.from("kelompok").select("id, nama").eq("pengajar_id", pengajar.id).order("nama")
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
      const { data: k } = await supabase.from("kelompok").select("id").eq("pengajar_id", pengajar.id)
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

      const build = (tipe: string) => (id: string, tanggal: string, santri_id: string, detail: string, status: string | null, catatan: string | null): Item => ({ id, tanggal, tipe, santri_id, detail, status, catatan })

      const [bacaan, cicilan, doa, komponen, praktik, gerakan, niat] = await Promise.all([
        supabase.from("perkembangan_bacaan").select("id, tanggal, santri_id, jenis_bacaan, jilid, halaman, surat_id, juz, status, catatan, surat(nama)").in("santri_id", santriIds),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(santri_id, surat(nama))").in("hafalan_santri.santri_id", santriIds),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, santri_id, status, catatan, doa(nama)").in("santri_id", santriIds),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, santri_id, status, catatan, komponen_salat(nama)").in("santri_id", santriIds),
        supabase.from("praktik_salat").select("id, tanggal, santri_id, status, catatan, jenis_salat(nama)").in("santri_id", santriIds),
        supabase.from("perkembangan_gerakan_salat").select("id, tanggal, santri_id, catatan").in("santri_id", santriIds),
        supabase.from("perkembangan_niat_salat").select("id, tanggal, santri_id, status, catatan, jenis_salat(nama)").in("santri_id", santriIds),
      ])

      const list: Item[] = []
      ;((bacaan.data ?? []) as unknown as BacaanRow[]).forEach((r) => {
        const detail = r.jenis_bacaan === "IQRA" ? `Iqra ${r.jilid} · Hal. ${r.halaman}` : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`
        list.push(build("BACAAN")(r.id, r.tanggal, r.santri_id, detail, r.status, r.catatan))
      })
      ;((cicilan.data ?? []) as unknown as CicilanRow[]).forEach((r) => {
        const sid = r.hafalan_santri?.santri_id ?? ""
        const detail = `${r.hafalan_santri?.surat?.nama ?? "-"} · ayat ${r.ayat_mulai}-${r.ayat_selesai}`
        list.push(build("HAFALAN SURAT")(r.id, r.tanggal, sid, detail, r.status, r.catatan))
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
  }, [user, selectedSantri, filterTipe, searchDate])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Riwayat" title="Rekap perkembangan" description="Timeline bacaan, hafalan, dan praktik salat santri." backHref="/pengajar" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Riwayat Perkembangan ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDateShort(p.tanggal)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
