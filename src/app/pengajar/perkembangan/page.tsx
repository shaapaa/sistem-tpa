"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, BookOpen, BookMarked, Moon, CheckCircle, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

interface Santri { id: string; nama: string; kelompok_id: string | null }
interface Kelompok { id: string; nama: string }
interface Surat { id: string; nomor: number; nama: string; jumlah_ayat: number }
interface Doa { id: string; nama: string }
interface Komponen { id: string; nama: string }
interface JenisSalat { id: string; nama: string }

// Urutan hafalan bertahap: Al-Fatihah dulu, lalu Juz 30 dari An-Nas (114) mundur ke An-Naba (78)
const progressionOrder = (nomor: number) => (nomor === 1 ? -1 : 114 - nomor)

const BAC_SURAT_STATUS = [
  { label: "Lancar", value: "LANCAR" },
  { label: "Kurang Lancar", value: "KURANG_LANCAR" },
  { label: "Tidak Lancar", value: "TIDAK_LANCAR" },
];
const KURANG_STATUS = [
  { label: "Lancar", value: "LANCAR" },
  { label: "Butuh Bimbingan", value: "BUTUH_BIMBINGAN" },
];

export default function PerkembanganPage() {
  const { user } = useAuth();
  const [kelompoks, setKelompoks] = useState<Kelompok[]>([]);
  const [selectedKelompok, setSelectedKelompok] = useState("");
  const [santris, setSantris] = useState<Santri[]>([]);
  const [selectedSantri, setSelectedSantri] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [surats, setSurats] = useState<Surat[]>([]);
  const [doas, setDoas] = useState<Doa[]>([]);
  const [komponens, setKomponens] = useState<Komponen[]>([]);
  const [jenisSalats, setJenisSalats] = useState<JenisSalat[]>([]);
  const supabase = createClient();

  // Bacaan form
  const [jenisBacaan, setJenisBacaan] = useState("IQRA");
  const [iqraJilid, setIqraJilid] = useState("");
  const [iqraHalaman, setIqraHalaman] = useState("");
  const [quranSuratId, setQuranSuratId] = useState("");
  const [quranJuz, setQuranJuz] = useState("");
  const [quranAyatMulai, setQuranAyatMulai] = useState("");
  const [quranAyatSelesai, setQuranAyatSelesai] = useState("");
  const [statusBacaan, setStatusBacaan] = useState("LANCAR");
  const [catatanBacaan, setCatatanBacaan] = useState("");

  // Hafalan form
  const [jenisHafalan, setJenisHafalan] = useState("SURAT");
  const [suratId, setSuratId] = useState("");
  const [ayatMulai, setAyatMulai] = useState("");
  const [ayatSelesai, setAyatSelesai] = useState("");
  const [statusHafalan, setStatusHafalan] = useState("LANCAR");
  const [doaId, setDoaId] = useState("");
  const [catatanHafalan, setCatatanHafalan] = useState("");

  // Sholat form
  const [jenisSalatId, setJenisSalatId] = useState("");
  const [statusSholat, setStatusSholat] = useState("LANCAR");
  const [catatanSholat, setCatatanSholat] = useState("");
  const [komponenStatus, setKomponenStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMasters = async () => {
      const [suratRes, doaRes, komponenRes, jenisRes] = await Promise.all([
        supabase.from("surat").select("id, nomor, nama, jumlah_ayat").or("juz.eq.30,nomor.eq.1").order("nomor"),
        supabase.from("doa").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("komponen_salat").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("jenis_salat").select("id, nama").eq("aktif", true).order("nama"),
      ])
      setSurats(((suratRes.data ?? []) as Surat[]).sort((a, b) => progressionOrder(a.nomor) - progressionOrder(b.nomor)))
      setDoas((doaRes.data ?? []) as Doa[])
      setKomponens((komponenRes.data ?? []) as Komponen[])
      setJenisSalats((jenisRes.data ?? []) as JenisSalat[])
    }
    fetchMasters()
  }, [])

  useEffect(() => {
    const fetchPengajar = async () => {
      if (!user) return
      const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
      if (!pengajar) return
      const { data: k } = await supabase.from("kelompok").select("id, nama").eq("pengajar_id", pengajar.id).order("nama")
      setKelompoks((k ?? []) as Kelompok[])
    }
    fetchPengajar()
  }, [user])

  useEffect(() => {
    const fetchSantris = async () => {
      if (!selectedKelompok) { setSantris([]); return; }
      const { data } = await supabase.from("santri").select("id, nama, kelompok_id").eq("kelompok_id", selectedKelompok).order("nama")
      setSantris((data ?? []) as Santri[])
      setSelectedSantri("")
      setSearch("")
    }
    fetchSantris()
  }, [selectedKelompok])

  // Ayat mulai otomatis dari capaian terakhir surat
  useEffect(() => {
    const loadAyatMulai = async () => {
      if (!selectedSantri || !suratId) { setAyatMulai(""); return }
      const { data: hs } = await supabase.from("hafalan_santri").select("id").eq("santri_id", selectedSantri).eq("surat_id", suratId).maybeSingle()
      if (!hs) { setAyatMulai("1"); return }
      const { data: last } = await supabase.from("hafalan_surat_cicilan").select("ayat_selesai").eq("hafalan_santri_id", hs.id).order("tanggal", { ascending: false }).limit(1).maybeSingle()
      setAyatMulai(last?.ayat_selesai ? String((last.ayat_selesai ?? 0) + 1) : "1")
    }
    loadAyatMulai()
  }, [selectedSantri, suratId])

  const filteredSantris = santris.filter((s) => s.nama.toLowerCase().includes(search.toLowerCase()))

  const today = new Date().toISOString().split("T")[0]

  // Adanya inputan perkembangan pada hari itu = santri hadir.
  // Set/upsert presensi HADIR (menimpa status non-hadir bila ada inputan perkembangan).
  const autoPresensi = async (santriId: string, pengajarId: string) => {
    try {
      const santri = santris.find((s) => s.id === santriId)
      await supabase.from("presensi").upsert({
        santri_id: santriId,
        tanggal: today,
        status: "HADIR",
        pengajar_id: pengajarId,
        kelompok_id: santri?.kelompok_id ?? null,
      }, { onConflict: "santri_id,tanggal" })
    } catch { /* best effort */ }
  }

  const handleSaveBacaan = async () => {
    if (!selectedSantri || !user) return
    setErrorMsg("")
    setSaving(true); setSaved(false)
    const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
    if (!pengajar) { setSaving(false); return }
    const payload: Record<string, unknown> = {
      santri_id: selectedSantri,
      pengajar_id: pengajar.id,
      tanggal: today,
      jenis_bacaan: jenisBacaan,
      status: statusBacaan,
      catatan: catatanBacaan || null,
    }
    if (jenisBacaan === "IQRA") {
      payload.jilid = parseInt(iqraJilid) || null
      payload.halaman = parseInt(iqraHalaman) || null
    } else {
      payload.surat_id = quranSuratId || null
      payload.juz = parseInt(quranJuz) || null
      payload.ayat_mulai = parseInt(quranAyatMulai) || null
      payload.ayat_selesai = parseInt(quranAyatSelesai) || null
    }
    await supabase.from("perkembangan_bacaan").insert(payload)
    await autoPresensi(selectedSantri, pengajar.id)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    setCatatanBacaan(""); setIqraJilid(""); setIqraHalaman(""); setQuranSuratId(""); setQuranJuz(""); setQuranAyatMulai(""); setQuranAyatSelesai("")
  }

  const handleSaveHafalan = async () => {
    if (!selectedSantri || !user) return
    setErrorMsg("")
    const surat = surats.find((s) => s.id === suratId)
    const sampai = parseInt(ayatSelesai) || 0
    const mulai = parseInt(ayatMulai) || 1
    if (jenisHafalan === "SURAT") {
      if (!suratId) { setErrorMsg("Pilih surah terlebih dahulu"); return }
      if (!sampai) { setErrorMsg("Isi ayat terakhir yang dihafal"); return }
      if (surat && sampai > surat.jumlah_ayat) {
        setErrorMsg(`Ayat melebihi jumlah ayat surah ${surat.nama} (hanya ${surat.jumlah_ayat} ayat)`)
        return
      }
      if (sampai < mulai) {
        setErrorMsg("Ayat selesai tidak boleh kurang dari ayat mulai")
        return
      }
    } else {
      if (!doaId) { setErrorMsg("Pilih doa terlebih dahulu"); return }
    }
    setSaving(true); setSaved(false)
    const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
    if (!pengajar) { setSaving(false); return }
    if (jenisHafalan === "SURAT") {
      const { data: hs } = await supabase.from("hafalan_santri").select("id").eq("santri_id", selectedSantri).eq("surat_id", suratId).maybeSingle()
      let hsId = hs?.id
      if (!hsId) {
        const { data: created } = await supabase.from("hafalan_santri").insert({ santri_id: selectedSantri, surat_id: suratId }).select("id").single()
        hsId = created?.id
      }
      if (hsId) {
        await supabase.from("hafalan_surat_cicilan").insert({
          hafalan_santri_id: hsId,
          pengajar_id: pengajar.id,
          tanggal: today,
          ayat_mulai: mulai,
          ayat_selesai: sampai,
          status: statusHafalan,
          jenis: "setoran_baru",
          catatan: catatanHafalan || null,
        })
      }
    } else {
      await supabase.from("perkembangan_hafalan_doa").insert({
        santri_id: selectedSantri,
        doa_id: doaId,
        pengajar_id: pengajar.id,
        tanggal: today,
        status: statusHafalan,
        catatan: catatanHafalan || null,
      })
    }
    await autoPresensi(selectedSantri, pengajar.id)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    setSuratId(""); setAyatMulai(""); setAyatSelesai(""); setDoaId(""); setCatatanHafalan("")
  }

  const handleSaveSholat = async () => {
    if (!selectedSantri || !user) return
    setErrorMsg("")
    setSaving(true); setSaved(false)
    const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
    if (!pengajar) { setSaving(false); return }
    // Level 1: komponen salat
    for (const komponen of komponens) {
      const st = komponenStatus[komponen.id]
      if (st) {
        await supabase.from("perkembangan_salat_komponen").insert({
          santri_id: selectedSantri,
          komponen_salat_id: komponen.id,
          pengajar_id: pengajar.id,
          tanggal: today,
          status: st,
        })
      }
    }
    // Level 2: praktik salat keseluruhan
    if (jenisSalatId) {
      await supabase.from("praktik_salat").insert({
        santri_id: selectedSantri,
        jenis_salat_id: jenisSalatId,
        pengajar_id: pengajar.id,
        tanggal: today,
        status: statusSholat,
        catatan: catatanSholat || null,
      })
    }
    await autoPresensi(selectedSantri, pengajar.id)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    setJenisSalatId(""); setCatatanSholat(""); setKomponenStatus({})
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Catatan belajar" title="Input perkembangan" description="Catat bacaan, hafalan, dan praktik salat santri." backHref="/pengajar" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Kelompok</Label>
          <Select value={selectedKelompok} onValueChange={(v) => setSelectedKelompok(v ?? "")} items={kelompoks.map((k) => ({ label: `Kelompok ${k.nama}`, value: k.id }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Pilih kelompok" /></SelectTrigger>
            <SelectContent>
              {kelompoks.map((k) => <SelectItem key={k.id} value={k.id}>Kelompok {k.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Santri ({santris.length})</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-3" placeholder="Cari nama santri..." disabled={!selectedKelompok} />
        </div>
      </div>

      {selectedKelompok && !selectedSantri && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {filteredSantris.length === 0 ? (
              <div className="p-5 text-center text-sm text-muted-foreground sm:p-8">
                Tidak ada santri pada kelompok ini
              </div>
            ) : (
              filteredSantris.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSantri(s.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    {s.nama.charAt(0)}
                  </span>
                  <span className="font-medium text-foreground">{s.nama}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {selectedSantri ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {(santris.find((s) => s.id === selectedSantri)?.nama ?? "?").charAt(0)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Input perkembangan untuk</p>
                <p className="font-medium text-foreground">{santris.find((s) => s.id === selectedSantri)?.nama ?? "Santri"}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => { setSelectedSantri(""); setSearch(""); }} className="h-9">
              <ArrowLeft className="mr-2 h-4 w-4" /> Ganti santri
            </Button>
          </div>
          <Tabs defaultValue="bacaan" className="w-full">
          <TabsList className="grid min-h-12 h-auto w-full grid-cols-3">
            <TabsTrigger value="bacaan" className="gap-1 px-1 text-xs sm:text-sm"><BookOpen className="h-4 w-4" /> Bacaan</TabsTrigger>
            <TabsTrigger value="hafalan" className="gap-1 px-1 text-xs sm:text-sm"><BookMarked className="h-4 w-4" /> Hafalan</TabsTrigger>
            <TabsTrigger value="sholat" className="gap-1 px-1 text-xs sm:text-sm"><Moon className="h-4 w-4" /> Praktik Salat</TabsTrigger>
          </TabsList>

          <TabsContent value="bacaan" className="space-y-4 pt-4">
            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Perkembangan Bacaan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Jenis Bacaan</Label>
                  <Select value={jenisBacaan} onValueChange={(v) => v && setJenisBacaan(v)} items={[{ label: "Iqra", value: "IQRA" }, { label: "Al-Qur&apos;an", value: "QURAN" }]}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IQRA">Iqra</SelectItem>
                      <SelectItem value="QURAN">Al-Qur&apos;an</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {jenisBacaan === "IQRA" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Jilid</Label>
                      <Select value={iqraJilid} onValueChange={(v) => setIqraJilid(v ?? "")} items={[1,2,3,4,5,6].map((n) => ({ label: `Jilid ${n}`, value: String(n) }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6].map((n) => <SelectItem key={n} value={String(n)}>Jilid {n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Halaman</Label>
                      <Input type="number" value={iqraHalaman} onChange={(e) => setIqraHalaman(e.target.value)} className="h-9" placeholder="Nomor halaman" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Surah</Label>
                        <Select value={quranSuratId} onValueChange={(v) => setQuranSuratId(v ?? "")} items={surats.map((s) => ({ label: s.nama, value: s.id }))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Pilih surah" /></SelectTrigger>
                          <SelectContent className="max-h-64">
                            {surats.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Juz</Label>
                        <Input type="number" value={quranJuz} onChange={(e) => setQuranJuz(e.target.value)} className="h-9" placeholder="Juz 1-30" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ayat Mulai</Label>
                        <Input type="number" value={quranAyatMulai} onChange={(e) => setQuranAyatMulai(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-2">
                        <Label>Ayat Selesai</Label>
                        <Input type="number" value={quranAyatSelesai} onChange={(e) => setQuranAyatSelesai(e.target.value)} className="h-9" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusBacaan} onValueChange={(v) => v && setStatusBacaan(v)} items={BAC_SURAT_STATUS}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BAC_SURAT_STATUS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea value={catatanBacaan} onChange={(e) => setCatatanBacaan(e.target.value)} placeholder="Tambahkan catatan..." className="min-h-[80px]" />
                </div>
                <Button onClick={handleSaveBacaan} disabled={saving} className="h-9 px-4">
                  {saving ? "Menyimpan..." : saved ? <><CheckCircle className="mr-2 h-4 w-4" /> Tersimpan</> : <><Save className="mr-2 h-4 w-4" /> Simpan</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hafalan" className="space-y-4 pt-4">
            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Perkembangan Hafalan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Jenis Hafalan</Label>
                  <Select value={jenisHafalan} onValueChange={(v) => setJenisHafalan(v ?? "SURAT")} items={[{ label: "Hafalan Surat", value: "SURAT" }, { label: "Hafalan Doa", value: "DOA" }]}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SURAT">Hafalan Surat</SelectItem>
                      <SelectItem value="DOA">Hafalan Doa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {jenisHafalan === "SURAT" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Surah (Juz 30 + Al-Fatihah)</Label>
                      <SearchableSelect
                        value={suratId}
                        onChange={setSuratId}
                        placeholder="Pilih surah"
                        options={surats.map((s) => ({ value: s.id, label: `${s.nama} (${s.jumlah_ayat} ayat)` }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Mulai dari ayat</Label>
                        <Input value={ayatMulai} className="h-9" disabled placeholder="Otomatis" />
                      </div>
                      <div className="space-y-2">
                        <Label>Sudah hafal sampai ayat</Label>
                        <Input type="number" value={ayatSelesai} onChange={(e) => setAyatSelesai(e.target.value)} className="h-9" placeholder="Ayat terakhir" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Doa Harian</Label>
                    <SearchableSelect
                      value={doaId}
                      onChange={setDoaId}
                      placeholder="Pilih doa"
                      options={doas.map((d) => ({ value: d.id, label: d.nama }))}
                    />
                  </div>
                )}

                {errorMsg && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMsg}</p>}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusHafalan} onValueChange={(v) => v && setStatusHafalan(v)} items={BAC_SURAT_STATUS}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BAC_SURAT_STATUS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea value={catatanHafalan} onChange={(e) => setCatatanHafalan(e.target.value)} placeholder="Tambahkan catatan..." className="min-h-[80px]" />
                </div>
                <Button onClick={handleSaveHafalan} disabled={saving} className="h-9 px-4">
                  {saving ? "Menyimpan..." : saved ? <><CheckCircle className="mr-2 h-4 w-4" /> Tersimpan</> : <><Save className="mr-2 h-4 w-4" /> Simpan</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sholat" className="space-y-4 pt-4">
            <Card className="card-elevated">
              <CardHeader><CardTitle className="text-sm font-medium">Praktik Salat</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Komponen Salat (Level 1)</Label>
                  <div className="mt-2 space-y-2">
                    {komponens.map((k) => (
                      <div key={k.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span className="text-sm font-medium text-foreground">{k.nama}</span>
                        <div className="flex gap-1.5">
                          {KURANG_STATUS.map((st) => (
                            <button
                              key={st.value}
                              type="button"
                              onClick={() => setKomponenStatus((prev) => ({ ...prev, [k.id]: prev[k.id] === st.value ? "" : st.value }))}
                              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${komponenStatus[k.id] === st.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jenis Salat (Level 2)</Label>
                    <Select value={jenisSalatId} onValueChange={(v) => setJenisSalatId(v ?? "")} items={jenisSalats.map((s) => ({ label: s.nama, value: s.id }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pilih salat" /></SelectTrigger>
                      <SelectContent>
                        {jenisSalats.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status Praktik</Label>
                    <Select value={statusSholat} onValueChange={(v) => v && setStatusSholat(v)} items={KURANG_STATUS}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KURANG_STATUS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea value={catatanSholat} onChange={(e) => setCatatanSholat(e.target.value)} placeholder="Tambahkan catatan..." className="min-h-[80px]" />
                </div>
                <Button onClick={handleSaveSholat} disabled={saving} className="h-9 px-4">
                  {saving ? "Menyimpan..." : saved ? <><CheckCircle className="mr-2 h-4 w-4" /> Tersimpan</> : <><Save className="mr-2 h-4 w-4" /> Simpan</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
      ) : selectedKelompok ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center sm:p-12">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Pilih santri untuk mulai input perkembangan</p>
        </div>
      ) : null}
    </div>
  );
}