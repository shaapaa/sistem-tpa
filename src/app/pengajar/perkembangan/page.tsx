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
interface Surat { id: string; nomor: number; nama: string; jumlah_ayat: number; juz: number }
interface Doa { id: string; nama: string }
interface Komponen { id: string; nama: string }
interface JenisSalat { id: string; nama: string }
interface HafalanCicilan { id: string; ayat_mulai: number; ayat_selesai: number; status: string; tanggal: string; created_at: string }
interface HafalanProgress { lastCicilan: HafalanCicilan | null; ayatMulaiBerikutnya: number; selesai: boolean }
interface HafalanDoaTerakhir { id: string; status: string; tanggal: string; catatan: string | null }

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

function saveErrorMessage(error: { message?: string } | null, fallback: string) {
  return error?.message ? `${fallback}: ${error.message}` : fallback
}

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
  const [bacaanSurats, setBacaanSurats] = useState<Surat[]>([]);
  const [doas, setDoas] = useState<Doa[]>([]);
  const [loadingDoas, setLoadingDoas] = useState(true);
  const [doaError, setDoaError] = useState("");
  const [komponens, setKomponens] = useState<Komponen[]>([]);
  const [jenisSalats, setJenisSalats] = useState<JenisSalat[]>([]);
  const [loadingSalatMasters, setLoadingSalatMasters] = useState(true);
  const [salatMasterError, setSalatMasterError] = useState("");
  const supabase = createClient();

  // Bacaan form
  const [iqraJilid, setIqraJilid] = useState("");
  const [iqraHalaman, setIqraHalaman] = useState("");
  const [quranSuratId, setQuranSuratId] = useState("");
  const [quranAyatMulai, setQuranAyatMulai] = useState("");
  const [quranAyatSelesai, setQuranAyatSelesai] = useState("");
  const [statusBacaan, setStatusBacaan] = useState("LANCAR");
  const [catatanBacaan, setCatatanBacaan] = useState("");

  // Hafalan form
  const [jenisHafalan, setJenisHafalan] = useState("SURAT");
  const [suratId, setSuratId] = useState("");
  const [ayatMulai, setAyatMulai] = useState("");
  const [ayatSelesai, setAyatSelesai] = useState("");
  const [hafalanProgress, setHafalanProgress] = useState<HafalanProgress | null>(null);
  const [loadingHafalanProgress, setLoadingHafalanProgress] = useState(false);
  const [statusHafalan, setStatusHafalan] = useState("LANCAR");
  const [doaId, setDoaId] = useState("");
  const [catatanHafalan, setCatatanHafalan] = useState("");
  const [statusHafalanDoa, setStatusHafalanDoa] = useState("LANCAR");
  const [catatanHafalanDoa, setCatatanHafalanDoa] = useState("");
  const [hafalanDoaTerakhir, setHafalanDoaTerakhir] = useState<HafalanDoaTerakhir | null>(null);
  const [loadingHafalanDoaTerakhir, setLoadingHafalanDoaTerakhir] = useState(false);

  // Praktik Salat form: kemampuan gerakan umum dan niat per jenis salat.
  const [gerakanStatus, setGerakanStatus] = useState<Record<string, string>>({});
  const [catatanGerakan, setCatatanGerakan] = useState("");
  const [jenisNiatSalatId, setJenisNiatSalatId] = useState("");
  const [statusNiatSalat, setStatusNiatSalat] = useState("LANCAR");
  const [catatanNiatSalat, setCatatanNiatSalat] = useState("");
  const [savingGerakan, setSavingGerakan] = useState(false);
  const [savingNiat, setSavingNiat] = useState(false);
  const [savedGerakan, setSavedGerakan] = useState(false);
  const [savedNiat, setSavedNiat] = useState(false);
  const [gerakanError, setGerakanError] = useState("");
  const [niatError, setNiatError] = useState("");

  useEffect(() => {
    const fetchMasters = async () => {
      setLoadingDoas(true)
      setDoaError("")
      setLoadingSalatMasters(true)
      setSalatMasterError("")
      try {
        const [suratRes, bacaanSuratRes, doaRes, komponenRes, jenisRes] = await Promise.all([
          supabase.from("surat").select("id, nomor, nama, jumlah_ayat, juz").or("juz.eq.30,nomor.eq.1").order("nomor"),
          supabase.from("surat").select("id, nomor, nama, jumlah_ayat, juz").eq("aktif", true).order("nomor"),
          supabase.from("doa").select("id, nama").eq("aktif", true).order("nama"),
          supabase.from("komponen_salat").select("id, nama").eq("aktif", true).order("nama"),
          supabase.from("jenis_salat").select("id, nama").eq("aktif", true).order("nama"),
        ])
        setSurats(((suratRes.data ?? []) as Surat[]).sort((a, b) => progressionOrder(a.nomor) - progressionOrder(b.nomor)))
        setBacaanSurats((bacaanSuratRes.data ?? []) as Surat[])
        if (doaRes.error) {
          setDoas([])
          setDoaError("Master Doa gagal dimuat. Coba muat ulang halaman.")
        } else {
          setDoas((doaRes.data ?? []) as Doa[])
        }
        setKomponens((komponenRes.data ?? []) as Komponen[])
        setJenisSalats((jenisRes.data ?? []) as JenisSalat[])
        if (komponenRes.error || jenisRes.error) {
          setKomponens([])
          setJenisSalats([])
          setSalatMasterError("Master Praktik Salat gagal dimuat. Coba muat ulang halaman.")
        }
      } catch {
        setDoas([])
        setDoaError("Master Doa gagal dimuat. Coba muat ulang halaman.")
        setKomponens([])
        setJenisSalats([])
        setSalatMasterError("Master Praktik Salat gagal dimuat. Coba muat ulang halaman.")
      } finally {
        setLoadingDoas(false)
        setLoadingSalatMasters(false)
      }
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
      const { data } = await supabase.from("santri").select("id, nama, kelompok_id").eq("kelompok_id", selectedKelompok).eq("is_active", true).order("nama")
      setSantris((data ?? []) as Santri[])
      setSelectedSantri("")
      setSearch("")
    }
    fetchSantris()
  }, [selectedKelompok])

  // Tampilan progres hanya untuk UX. RPC tetap menghitung ulang ayat mulai saat simpan.
  const loadAyatMulai = async () => {
    if (!selectedSantri || !suratId) {
      setAyatMulai("")
      setAyatSelesai("")
      setHafalanProgress(null)
      return
    }

    setLoadingHafalanProgress(true)
    const surat = surats.find((item) => item.id === suratId)
    const { data: hs } = await supabase
      .from("hafalan_santri")
      .select("id")
      .eq("santri_id", selectedSantri)
      .eq("surat_id", suratId)
      .maybeSingle()

    if (!hs) {
      setAyatMulai("1")
      setAyatSelesai("")
      setHafalanProgress({ lastCicilan: null, ayatMulaiBerikutnya: 1, selesai: false })
      setLoadingHafalanProgress(false)
      return
    }

    const { data: last } = await supabase
      .from("hafalan_surat_cicilan")
      .select("id, ayat_mulai, ayat_selesai, status, tanggal, created_at")
      .eq("hafalan_santri_id", hs.id)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastCicilan = (last ?? null) as HafalanCicilan | null
    const ayatMulaiBerikutnya = (lastCicilan?.ayat_selesai ?? 0) + 1
    setAyatMulai(String(ayatMulaiBerikutnya))
    setAyatSelesai("")
    setHafalanProgress({
      lastCicilan,
      ayatMulaiBerikutnya,
      selesai: Boolean(surat && ayatMulaiBerikutnya > surat.jumlah_ayat),
    })
    setLoadingHafalanProgress(false)
  }

  useEffect(() => {
    loadAyatMulai()
  }, [selectedSantri, suratId])

  useEffect(() => {
    const loadHafalanDoaTerakhir = async () => {
      if (!selectedSantri || !doaId) {
        setHafalanDoaTerakhir(null)
        return
      }

      setLoadingHafalanDoaTerakhir(true)
      const { data } = await supabase
        .from("perkembangan_hafalan_doa")
        .select("id, status, tanggal, catatan")
        .eq("santri_id", selectedSantri)
        .eq("doa_id", doaId)
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle()

      setHafalanDoaTerakhir((data ?? null) as HafalanDoaTerakhir | null)
      setLoadingHafalanDoaTerakhir(false)
    }
    loadHafalanDoaTerakhir()
  }, [selectedSantri, doaId])

  const filteredSantris = santris.filter((s) => s.nama.toLowerCase().includes(search.toLowerCase()))
  const selectedKelompokData = kelompoks.find((kelompok) => kelompok.id === selectedKelompok)
  const selectedQuranSurat = bacaanSurats.find((surat) => surat.id === quranSuratId)
  const jenisBacaan = selectedKelompokData?.nama === "A"
    ? "IQRA"
    : selectedKelompokData?.nama === "B"
      ? "QURAN"
      : null

  const resetBacaanForm = () => {
    setIqraJilid("")
    setIqraHalaman("")
    setQuranSuratId("")
    setQuranAyatMulai("")
    setQuranAyatSelesai("")
    setStatusBacaan("LANCAR")
    setCatatanBacaan("")
    setErrorMsg("")
    setSaved(false)
  }

  const resetHafalanDoaForm = () => {
    setDoaId("")
    setStatusHafalanDoa("LANCAR")
    setCatatanHafalanDoa("")
    setHafalanDoaTerakhir(null)
  }

  const resetPraktikSalatForm = () => {
    setGerakanStatus({})
    setCatatanGerakan("")
    setJenisNiatSalatId("")
    setStatusNiatSalat("LANCAR")
    setCatatanNiatSalat("")
    setGerakanError("")
    setNiatError("")
    setSavedGerakan(false)
    setSavedNiat(false)
  }

  const handleKelompokChange = (kelompokId: string | null) => {
    setSelectedKelompok(kelompokId ?? "")
    setSelectedSantri("")
    setSearch("")
    setSuratId("")
    setAyatMulai("")
    setAyatSelesai("")
    setHafalanProgress(null)
    resetBacaanForm()
    resetHafalanDoaForm()
    resetPraktikSalatForm()
  }

  const handleSelectSantri = (santriId: string) => {
    setSelectedSantri(santriId)
    setSuratId("")
    setAyatMulai("")
    setAyatSelesai("")
    setHafalanProgress(null)
    resetBacaanForm()
    resetHafalanDoaForm()
    resetPraktikSalatForm()
  }

  const today = new Date().toISOString().split("T")[0]

  const handleSaveBacaan = async () => {
    if (!selectedSantri || !user) return
    setErrorMsg("")
    const { data: santriTerkini, error: santriError } = await supabase
      .from("santri")
      .select("kelompok(nama)")
      .eq("id", selectedSantri)
      .single()
    const namaKelompokTerkini = (santriTerkini as { kelompok?: { nama?: string } | null } | null)?.kelompok?.nama
    const jenisBacaanTerkini = namaKelompokTerkini === "A" ? "IQRA" : namaKelompokTerkini === "B" ? "QURAN" : null
    if (santriError || !jenisBacaanTerkini) {
      setErrorMsg("Santri harus tetap berada pada Kelompok A atau B yang menjadi cakupan Anda sebelum perkembangan bacaan dapat disimpan")
      return
    }
    const iqraHalamanNumber = Number(iqraHalaman)
    const quranJuzNumber = selectedQuranSurat?.juz ?? 0
    const quranAyatMulaiNumber = Number(quranAyatMulai)
    const quranAyatSelesaiNumber = Number(quranAyatSelesai)
    const quranSurat = selectedQuranSurat

    if (jenisBacaanTerkini === "IQRA" && (!iqraJilid || !Number.isInteger(iqraHalamanNumber) || iqraHalamanNumber < 1)) {
      setErrorMsg("Jilid dan halaman wajib diisi")
      return
    }
    if (jenisBacaanTerkini === "QURAN") {
      if (!quranSurat || !quranSuratId || !Number.isInteger(quranJuzNumber) || quranJuzNumber < 1 || quranJuzNumber > 30 || !Number.isInteger(quranAyatMulaiNumber) || !Number.isInteger(quranAyatSelesaiNumber)) {
        setErrorMsg("Surah, juz, ayat mulai, dan ayat selesai wajib diisi")
        return
      }
      if (quranAyatMulaiNumber < 1 || quranAyatSelesaiNumber < quranAyatMulaiNumber) {
        setErrorMsg("Ayat selesai tidak boleh kurang dari ayat mulai")
        return
      }
      if (quranSurat && quranAyatSelesaiNumber > quranSurat.jumlah_ayat) {
        setErrorMsg(`Ayat melebihi jumlah ayat surah ${quranSurat.nama} (hanya ${quranSurat.jumlah_ayat} ayat)`)
        return
      }
    }

    setSaving(true); setSaved(false)
    const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
    if (!pengajar) { setErrorMsg("Profil pengajar tidak ditemukan"); setSaving(false); return }
    const payload: Record<string, unknown> = {
      santri_id: selectedSantri,
      pengajar_id: pengajar.id,
      tanggal: today,
      jenis_bacaan: jenisBacaanTerkini,
      status: statusBacaan,
      catatan: catatanBacaan || null,
    }
    if (jenisBacaanTerkini === "IQRA") {
      payload.jilid = parseInt(iqraJilid) || null
      payload.halaman = iqraHalamanNumber
    } else {
      payload.surat_id = quranSuratId || null
      payload.juz = quranJuzNumber
      payload.ayat_mulai = quranAyatMulaiNumber
      payload.ayat_selesai = quranAyatSelesaiNumber
    }
    const { error } = await supabase.from("perkembangan_bacaan").insert(payload)
    if (error) { setErrorMsg(saveErrorMessage(error, "Perkembangan bacaan gagal disimpan")); setSaving(false); return }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    setCatatanBacaan(""); setIqraJilid(""); setIqraHalaman(""); setQuranSuratId(""); setQuranAyatMulai(""); setQuranAyatSelesai("")
  }

  const handleSaveHafalan = async () => {
    if (!selectedSantri || !user) return
    setErrorMsg("")
    const sampai = parseInt(ayatSelesai) || 0
    if (jenisHafalan === "SURAT") {
      if (!suratId) { setErrorMsg("Pilih surah terlebih dahulu"); return }
      if (!sampai) { setErrorMsg("Isi ayat terakhir yang dihafal"); return }
      if (hafalanProgress?.selesai) { setErrorMsg("Hafalan surat ini sudah selesai"); return }
    } else {
      if (!doaId) { setErrorMsg("Pilih doa terlebih dahulu"); return }
    }
    setSaving(true); setSaved(false)
    if (jenisHafalan === "SURAT") {
      const { data, error } = await supabase.rpc("create_hafalan_cicilan", {
        p_santri_id: selectedSantri,
        p_surat_id: suratId,
        p_ayat_selesai: sampai,
        p_status: statusHafalan,
        p_catatan: catatanHafalan || null,
      })
      if (error) {
        setErrorMsg(saveErrorMessage(error, "Setoran hafalan gagal disimpan"))
        await loadAyatMulai()
        setSaving(false)
        return
      }
      const cicilanTersimpan = (data?.[0] ?? null) as {
        cicilan_id: string; ayat_mulai: number; ayat_selesai: number; status: string; tanggal: string; created_at: string; jumlah_ayat: number
      } | null
      if (cicilanTersimpan) {
        const ayatMulaiBerikutnya = cicilanTersimpan.ayat_selesai + 1
        setAyatMulai(String(ayatMulaiBerikutnya))
        setHafalanProgress({
          lastCicilan: {
            id: cicilanTersimpan.cicilan_id,
            ayat_mulai: cicilanTersimpan.ayat_mulai,
            ayat_selesai: cicilanTersimpan.ayat_selesai,
            status: cicilanTersimpan.status,
            tanggal: cicilanTersimpan.tanggal,
            created_at: cicilanTersimpan.created_at,
          },
          ayatMulaiBerikutnya,
          selesai: ayatMulaiBerikutnya > cicilanTersimpan.jumlah_ayat,
        })
      }
      await loadAyatMulai()
      setCatatanHafalan("")
    } else {
      const { data: pengajar } = await supabase.from("pengajar").select("id").eq("profile_id", user.id).single()
      if (!pengajar) { setErrorMsg("Profil pengajar tidak ditemukan"); setSaving(false); return }
      const { error } = await supabase.from("perkembangan_hafalan_doa").insert({
        santri_id: selectedSantri,
        doa_id: doaId,
        pengajar_id: pengajar.id,
        tanggal: today,
        status: statusHafalanDoa,
        catatan: catatanHafalanDoa || null,
      })
      if (error) { setErrorMsg(saveErrorMessage(error, "Hafalan doa gagal disimpan")); setSaving(false); return }
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    if (jenisHafalan === "DOA") resetHafalanDoaForm()
  }

  const handleSaveGerakanSalat = async () => {
    if (!selectedSantri || !user) return
    setGerakanError("")
    const penilaianKomponen = komponens.map((komponen) => ({
      komponen_salat_id: komponen.id,
      status: gerakanStatus[komponen.id],
    }))
    if (komponens.length !== 8 || penilaianKomponen.some((komponen) => !KURANG_STATUS.some((status) => status.value === komponen.status))) {
      setGerakanError("Semua delapan komponen gerakan salat wajib dinilai")
      return
    }

    setSavingGerakan(true)
    setSavedGerakan(false)
    const { error } = await supabase.rpc("create_perkembangan_gerakan_salat", {
      p_santri_id: selectedSantri,
      p_komponen: penilaianKomponen,
      p_catatan: catatanGerakan || null,
    })
    if (error) {
      setGerakanError(saveErrorMessage(error, "Penilaian gerakan salat gagal disimpan"))
      setSavingGerakan(false)
      return
    }

    setSavingGerakan(false)
    setSavedGerakan(true)
    setGerakanStatus({})
    setCatatanGerakan("")
    setTimeout(() => setSavedGerakan(false), 2500)
  }

  const handleSaveNiatSalat = async () => {
    if (!selectedSantri || !user) return
    setNiatError("")
    if (!jenisNiatSalatId) {
      setNiatError("Pilih jenis salat terlebih dahulu")
      return
    }

    setSavingNiat(true)
    setSavedNiat(false)
    const { error } = await supabase.rpc("create_perkembangan_niat_salat", {
      p_santri_id: selectedSantri,
      p_jenis_salat_id: jenisNiatSalatId,
      p_status: statusNiatSalat,
      p_catatan: catatanNiatSalat || null,
    })
    if (error) {
      setNiatError(saveErrorMessage(error, "Penilaian niat salat gagal disimpan"))
      setSavingNiat(false)
      return
    }

    setSavingNiat(false)
    setSavedNiat(true)
    setJenisNiatSalatId("")
    setStatusNiatSalat("LANCAR")
    setCatatanNiatSalat("")
    setTimeout(() => setSavedNiat(false), 2500)
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Catatan belajar" title="Input perkembangan" description="Catat bacaan, hafalan, dan praktik salat santri." backHref="/pengajar" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Kelompok</Label>
          <Select value={selectedKelompok} onValueChange={handleKelompokChange} items={kelompoks.map((k) => ({ label: `Kelompok ${k.nama}`, value: k.id }))}>
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
                  onClick={() => handleSelectSantri(s.id)}
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
            <Button variant="outline" onClick={() => { setSelectedSantri(""); setSearch(""); resetBacaanForm(); resetHafalanDoaForm(); resetPraktikSalatForm() }} className="h-9">
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
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Level bacaan mengikuti penugasan kelompok</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {jenisBacaan === "IQRA" ? "Iqra" : "Al-Qur'an"}
                      <span className="ml-2 text-xs font-medium text-primary">Kelompok {selectedKelompokData?.nama}</span>
                    </p>
                  </div>
                  <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Otomatis</span>
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
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Surah</Label>
                        <SearchableSelect
                          value={quranSuratId}
                          onChange={setQuranSuratId}
                          placeholder="Cari surah dari 30 juz"
                          options={bacaanSurats.map((s) => ({ value: s.id, label: `${s.nomor}. ${s.nama} — Juz ${s.juz}` }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Juz</Label>
                        <Input value={selectedQuranSurat ? `Juz ${selectedQuranSurat.juz}` : ""} className="h-9" placeholder="Otomatis dari surah" disabled />
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
                {errorMsg && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMsg}</p>}
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
                    {suratId && (
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm">
                        {loadingHafalanProgress ? (
                          <p className="text-muted-foreground">Memuat progres hafalan...</p>
                        ) : hafalanProgress?.selesai ? (
                          <p className="font-medium text-emerald-700 dark:text-emerald-400">Hafalan surat ini sudah selesai.</p>
                        ) : hafalanProgress?.lastCicilan ? (
                          <div className="space-y-1">
                            <p>Progres terakhir: Ayat {hafalanProgress.lastCicilan.ayat_mulai}–{hafalanProgress.lastCicilan.ayat_selesai}</p>
                            <p className="text-muted-foreground">Status: {BAC_SURAT_STATUS.find((item) => item.value === hafalanProgress.lastCicilan?.status)?.label ?? hafalanProgress.lastCicilan.status}</p>
                            <p className="font-medium">Berikutnya mulai ayat {hafalanProgress.ayatMulaiBerikutnya}</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p>Belum ada cicilan.</p>
                            <p className="font-medium">Mulai dari ayat 1</p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Mulai dari ayat</Label>
                        <Input value={ayatMulai} className="h-9" disabled placeholder="Otomatis" />
                      </div>
                      <div className="space-y-2">
                        <Label>Sudah hafal sampai ayat</Label>
                        <Input type="number" value={ayatSelesai} onChange={(e) => setAyatSelesai(e.target.value)} className="h-9" placeholder="Ayat terakhir" disabled={loadingHafalanProgress || hafalanProgress?.selesai} min={ayatMulai || 1} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Doa Harian</Label>
                      {loadingDoas ? (
                        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">Memuat master Doa...</p>
                      ) : doaError ? (
                        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{doaError}</p>
                      ) : doas.length === 0 ? (
                        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">Belum ada Doa aktif yang dapat dipilih.</p>
                      ) : (
                        <SearchableSelect
                          value={doaId}
                          onChange={setDoaId}
                          placeholder="Pilih doa"
                          options={doas.map((d) => ({ value: d.id, label: d.nama }))}
                        />
                      )}
                    </div>
                    {doaId && !loadingDoas && !doaError && (
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm">
                        {loadingHafalanDoaTerakhir ? (
                          <p className="text-muted-foreground">Memuat riwayat terakhir...</p>
                        ) : hafalanDoaTerakhir ? (
                          <div className="space-y-1">
                            <p>Riwayat terakhir: {BAC_SURAT_STATUS.find((item) => item.value === hafalanDoaTerakhir.status)?.label ?? hafalanDoaTerakhir.status}</p>
                            <p className="text-muted-foreground">Tanggal: {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${hafalanDoaTerakhir.tanggal}T00:00:00`))}</p>
                            {hafalanDoaTerakhir.catatan && <p className="text-muted-foreground">Catatan: {hafalanDoaTerakhir.catatan}</p>}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Belum ada riwayat untuk Doa ini.</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {errorMsg && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMsg}</p>}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={jenisHafalan === "DOA" ? statusHafalanDoa : statusHafalan} onValueChange={(v) => v && (jenisHafalan === "DOA" ? setStatusHafalanDoa(v) : setStatusHafalan(v))} items={BAC_SURAT_STATUS}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BAC_SURAT_STATUS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea value={jenisHafalan === "DOA" ? catatanHafalanDoa : catatanHafalan} onChange={(e) => jenisHafalan === "DOA" ? setCatatanHafalanDoa(e.target.value) : setCatatanHafalan(e.target.value)} placeholder="Tambahkan catatan..." className="min-h-[80px]" />
                </div>
                <Button onClick={handleSaveHafalan} disabled={saving || (jenisHafalan === "SURAT" && (loadingHafalanProgress || hafalanProgress?.selesai)) || (jenisHafalan === "DOA" && (loadingDoas || Boolean(doaError) || doas.length === 0))} className="h-9 px-4">
                  {saving ? "Menyimpan..." : saved ? <><CheckCircle className="mr-2 h-4 w-4" /> Tersimpan</> : <><Save className="mr-2 h-4 w-4" /> Simpan</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sholat" className="space-y-4 pt-4">
            {loadingSalatMasters ? (
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">Memuat master Praktik Salat...</p>
            ) : salatMasterError ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{salatMasterError}</p>
            ) : komponens.length !== 8 || jenisSalats.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">Master Praktik Salat belum lengkap. Hubungi Admin untuk memeriksa delapan komponen dan jenis salat aktif.</p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Gerakan Salat</CardTitle>
                    <p className="text-sm text-muted-foreground">Nilai seluruh delapan kemampuan gerakan umum Santri.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {komponens.map((komponen) => (
                        <div key={komponen.id} className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm font-medium text-foreground">{komponen.nama}</span>
                          <div className="flex gap-1.5">
                            {KURANG_STATUS.map((status) => (
                              <button
                                key={status.value}
                                type="button"
                                onClick={() => setGerakanStatus((prev) => ({ ...prev, [komponen.id]: status.value }))}
                                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${gerakanStatus[komponen.id] === status.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                              >
                                {status.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Catatan (Opsional)</Label>
                      <Textarea value={catatanGerakan} onChange={(e) => setCatatanGerakan(e.target.value)} placeholder="Tambahkan catatan penilaian gerakan..." className="min-h-[80px]" />
                    </div>
                    {gerakanError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{gerakanError}</p>}
                    <Button onClick={handleSaveGerakanSalat} disabled={savingGerakan} className="h-9 px-4">
                      {savingGerakan ? "Menyimpan..." : savedGerakan ? <><CheckCircle className="mr-2 h-4 w-4" /> Tersimpan</> : <><Save className="mr-2 h-4 w-4" /> Simpan Penilaian Gerakan</>}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Niat Salat</CardTitle>
                    <p className="text-sm text-muted-foreground">Nilai niat secara terpisah untuk setiap jenis salat.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Jenis Salat</Label>
                      <Select value={jenisNiatSalatId} onValueChange={(value) => setJenisNiatSalatId(value ?? "")} items={jenisSalats.map((salat) => ({ label: salat.nama, value: salat.id }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Pilih jenis salat" /></SelectTrigger>
                        <SelectContent>
                          {jenisSalats.map((salat) => <SelectItem key={salat.id} value={salat.id}>{salat.nama}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status Niat</Label>
                      <Select value={statusNiatSalat} onValueChange={(value) => value && setStatusNiatSalat(value)} items={KURANG_STATUS}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {KURANG_STATUS.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Catatan (Opsional)</Label>
                      <Textarea value={catatanNiatSalat} onChange={(e) => setCatatanNiatSalat(e.target.value)} placeholder="Tambahkan catatan penilaian niat..." className="min-h-[80px]" />
                    </div>
                    {niatError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{niatError}</p>}
                    <Button onClick={handleSaveNiatSalat} disabled={savingNiat} className="h-9 px-4">
                      {savingNiat ? "Menyimpan..." : savedNiat ? <><CheckCircle className="mr-2 h-4 w-4" /> Tersimpan</> : <><Save className="mr-2 h-4 w-4" /> Simpan Niat Salat</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
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
