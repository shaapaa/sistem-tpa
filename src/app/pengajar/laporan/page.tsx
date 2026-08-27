"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { DatePicker } from "@/components/ui/date-picker";
import { createReportPdf } from "@/lib/report-pdf";

interface Item {
  id: string
  tanggal: string
  tipe: string
  santri_id: string
  detail: string
  status: string | null
  catatan: string | null
}

type BacaanRow = { id: string; tanggal: string; santri_id: string; jenis_bacaan: string | null; jilid: number | null; halaman: number | null; juz: number | null; status: string | null; catatan: string | null; surat?: { nama: string } | null }
type CicilanRow = { id: string; tanggal: string; ayat_mulai: number | null; ayat_selesai: number | null; status: string | null; catatan: string | null; hafalan_santri?: { santri_id: string; surat?: { nama: string } | null } | null }
type DoaRow = { id: string; tanggal: string; santri_id: string; status: string | null; catatan: string | null; doa?: { nama: string } | null }
type KomponenRow = { id: string; tanggal: string; santri_id: string; status: string | null; catatan: string | null; komponen_salat?: { nama: string } | null }
type PraktikRow = { id: string; tanggal: string; santri_id: string; status: string | null; catatan: string | null; jenis_salat?: { nama: string } | null }

export default function LaporanPage() {
  const { user } = useAuth();
  const [kelompoks, setKelompoks] = useState<{ id: string; nama: string }[]>([]);
  const [selectedKelompok, setSelectedKelompok] = useState("");
  const [santris, setSantris] = useState<{ id: string; nama: string }[]>([]);
  const [selectedSantri, setSelectedSantri] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [catatanLaporan, setCatatanLaporan] = useState("");
  const [catatanSaved, setCatatanSaved] = useState(false);
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
      const { data } = await supabase.from("santri").select("id, nama").eq("kelompok_id", selectedKelompok).order("nama")
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
      const { data: santriRes } = await supabase.from("santri").select("id, nama").in("kelompok_id", kelompokIds)
      const santriRows = (santriRes ?? []) as unknown as { id: string; nama: string }[]
      const santriIds = santriRows.map((s) => s.id)
      if (santriIds.length === 0) { setItems([]); return }
      const nameMap: Record<string, string> = {}
      santriRows.forEach((s) => { nameMap[s.id] = s.nama })
      setSantriNames(nameMap)

      const [bacaan, cicilan, doa, komponen, praktik] = await Promise.all([
        supabase.from("perkembangan_bacaan").select("id, tanggal, santri_id, jenis_bacaan, jilid, halaman, juz, status, catatan, surat(nama)").in("santri_id", santriIds),
        supabase.from("hafalan_surat_cicilan").select("id, tanggal, ayat_mulai, ayat_selesai, status, catatan, hafalan_santri(santri_id, surat(nama))").in("hafalan_santri.santri_id", santriIds),
        supabase.from("perkembangan_hafalan_doa").select("id, tanggal, santri_id, status, catatan, doa(nama)").in("santri_id", santriIds),
        supabase.from("perkembangan_salat_komponen").select("id, tanggal, santri_id, status, catatan, komponen_salat(nama)").in("santri_id", santriIds),
        supabase.from("praktik_salat").select("id, tanggal, santri_id, status, catatan, jenis_salat(nama)").in("santri_id", santriIds),
      ])

      const build = (tipe: string) => (id: string, tanggal: string, santri_id: string, detail: string, status: string | null, catatan: string | null): Item => ({ id, tanggal, tipe, santri_id, detail, status, catatan })
      const list: Item[] = []
      ;((bacaan.data ?? []) as unknown as BacaanRow[]).forEach((r) => {
        const detail = r.jenis_bacaan === "IQRA" ? `Iqra ${r.jilid} · Hal. ${r.halaman}` : `${r.surat?.nama ?? "-"} · Juz ${r.juz ?? "-"}`
        list.push(build("Bacaan")(r.id, r.tanggal, r.santri_id, detail, r.status, r.catatan))
      })
      ;((cicilan.data ?? []) as unknown as CicilanRow[]).forEach((r) => {
        list.push(build("Hafalan Surat")(r.id, r.tanggal, r.hafalan_santri?.santri_id ?? "", `${r.hafalan_santri?.surat?.nama ?? "-"} · ayat ${r.ayat_mulai}-${r.ayat_selesai}`, r.status, r.catatan))
      })
      ;((doa.data ?? []) as unknown as DoaRow[]).forEach((r) => list.push(build("Hafalan Doa")(r.id, r.tanggal, r.santri_id, r.doa?.nama ?? "-", r.status, r.catatan)))
      ;((komponen.data ?? []) as unknown as KomponenRow[]).forEach((r) => list.push(build("Salat Komponen")(r.id, r.tanggal, r.santri_id, r.komponen_salat?.nama ?? "-", r.status, r.catatan)))
      ;((praktik.data ?? []) as unknown as PraktikRow[]).forEach((r) => list.push(build("Praktik Salat")(r.id, r.tanggal, r.santri_id, r.jenis_salat?.nama ?? "-", r.status, r.catatan)))

      const filtered = list.filter((it) => {
        if (selectedSantri && it.santri_id !== selectedSantri) return false
        if (dateFrom && it.tanggal < dateFrom) return false
        if (dateTo && it.tanggal > dateTo) return false
        return true
      }).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
      setItems(filtered)
    }
    fetchData()
  }, [user, selectedSantri, dateFrom, dateTo])

  const handleExportPDF = async () => {
    const grouped = items.reduce((acc, it) => {
      const name = santriNames[it.santri_id] ?? "Unknown"
      if (!acc[name]) acc[name] = []
      acc[name].push(it)
      return acc
    }, {} as Record<string, Item[]>)

    await createReportPdf({
      filename: `laporan-perkembangan-${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Laporan Perkembangan Santri",
      metadata: [
        `Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`,
        ...(dateFrom || dateTo ? [`Periode: ${dateFrom || "Awal"} - ${dateTo || "Sekarang"}`] : []),
      ],
      tables: Object.entries(grouped).map(([nama, list]) => ({
        title: nama,
        head: ["Tanggal", "Tipe", "Detail", "Status", "Catatan"],
        body: list.map((it) => [formatDateShort(it.tanggal), it.tipe, it.detail, it.status ?? "-", it.catatan ?? "-"]),
      })),
      notes: catatanLaporan ? [{ title: "Catatan Pengajar", body: catatanLaporan }] : [],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dokumen" title="Laporan perkembangan" description="Rekap perkembangan santri dengan catatan pengajar." backHref="/pengajar" action={<Button onClick={handleExportPDF} className="h-9 px-4" disabled={items.length === 0}><Download className="mr-2 h-4 w-4" /> Unduh laporan</Button>} />

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
          <Label>Dari Tanggal</Label>
          <DatePicker value={dateFrom} onChange={setDateFrom} />
        </div>
        <div className="space-y-2">
          <Label>Sampai Tanggal</Label>
          <DatePicker value={dateTo} onChange={setDateTo} />
        </div>
      </div>

      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Catatan Pengajar</CardTitle>
          {catatanSaved && <span className="text-xs text-green-600">Tersimpan</span>}
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={catatanLaporan}
            onChange={(e) => { setCatatanLaporan(e.target.value); setCatatanSaved(false); }}
            placeholder="Tambahkan catatan pengajar yang akan disertakan dalam laporan..."
            className="min-h-[100px]"
          />
          <Button onClick={() => setCatatanSaved(true)} className="h-9 px-4" disabled={catatanSaved}>Simpan Catatan</Button>
          <p className="text-xs text-muted-foreground">Catatan ini akan disertakan saat laporan diunduh.</p>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Preview Laporan ({items.length} data)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center sm:p-8">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada data untuk dilaporkan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(items.reduce((acc, it) => {
                const name = santriNames[it.santri_id] ?? "Unknown"
                if (!acc[name]) acc[name] = []
                acc[name].push(it)
                return acc
              }, {} as Record<string, Item[]>)).map(([nama, list]) => (
                <div key={nama} className="rounded-lg border border-border p-4">
                  <h3 className="font-medium text-foreground mb-3">{nama}</h3>
                  <div className="space-y-2">
                    {list.map((it) => (
                      <div key={it.id} className="flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="w-28 justify-center">{it.tipe}</Badge>
                        <span className="text-muted-foreground">{formatDateShort(it.tanggal)}</span>
                        <span className="flex-1">{it.detail}</span>
                        {it.status && <Badge variant="outline">{it.status}</Badge>}
                      </div>
                    ))}
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