"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, BookOpen, BookMarked, Moon, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

interface Santri { id: string; nama: string; group_id: string; }
interface Group { id: string; nama_group: string; }

const IQRA_OPTIONS = [1, 2, 3, 4, 5, 6];
const JUZ_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);
const SURAH_LIST = [
  "Al-Fatihah", "Al-Baqarah", "Ali Imran", "An-Nisa", "Al-Maidah",
  "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr",
  "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
  "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan",
  "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir",
  "Ya Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
  "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
  "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah",
  "As-Saf", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq",
  "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah",
  "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj",
  "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
  "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat",
  "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil",
  "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];
const SHOLAT_OPTIONS = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya", "Sholat Dhuha", "Sholat Tahajud", "Sholat Sunnah Lainnya"];
const PENILAIAN_OPTIONS = [
  { label: "Baik", value: "BAIK" },
  { label: "Cukup Baik", value: "CUKUP_BAIK" },
  { label: "Kurang", value: "KURANG" },
];

export default function PerkembanganPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [santris, setSantris] = useState<Santri[]>([]);
  const [selectedSantri, setSelectedSantri] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  // Bacaan form
  const [jenisBacaan, setJenisBacaan] = useState("IQRA");
  const [iqraForm, setIqraForm] = useState({ iqra_ke: "", halaman: "" });
  const [quranForm, setQuranForm] = useState({ juz: "", surah: "", ayat_mulai: "", ayat_selesai: "" });
  const [penilaianBacaan, setPenilaianBacaan] = useState("BAIK");
  const [catatanBacaan, setCatatanBacaan] = useState("");

  // Hafalan form
  const [hafalanForm, setHafalanForm] = useState({ nama_surah: "", penilaian: "BAIK", catatan: "" });

  // Praktik Sholat form
  const [sholatForm, setSholatForm] = useState({ jenis_sholat: "Subuh", penilaian: "BAIK", catatan: "" });

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
      if (!pengajar) return;
      const { data: gp } = await supabase.from("group_pengajars").select("group_id, groups(id, nama_group)").eq("pengajar_id", pengajar.id);
      setGroups(gp?.map((g: any) => g.groups).filter(Boolean) ?? []);
    };
    fetchGroups();
  }, [user]);

  useEffect(() => {
    const fetchSantris = async () => {
      if (!selectedGroup) { setSantris([]); return; }
      const { data } = await supabase.from("santris").select("id, nama, group_id").eq("group_id", selectedGroup).order("nama");
      setSantris(data ?? []);
      setSelectedSantri("");
    };
    fetchSantris();
  }, [selectedGroup]);

  const handleSaveBacaan = async () => {
    if (!selectedSantri || !user) return;
    setSaving(true);
    setSaved(false);

    const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
    if (!pengajar) { setSaving(false); return; }

    const payload: any = {
      student_id: selectedSantri,
      teacher_id: pengajar.id,
      tanggal: new Date().toISOString().split("T")[0],
      tipe_perkembangan: "BACAAN",
      jenis_bacaan: jenisBacaan,
      penilaian: penilaianBacaan,
      catatan: catatanBacaan || null,
    };

    if (jenisBacaan === "IQRA") {
      payload.iqra_ke = parseInt(iqraForm.iqra_ke) || null;
      payload.halaman_iqra = parseInt(iqraForm.halaman) || null;
    } else {
      payload.juz = parseInt(quranForm.juz) || null;
      payload.surah = quranForm.surah || null;
    }

    await supabase.from("perkembangan_santris").insert(payload);

    // Auto-create attendance (best-effort, never blocks save confirmation)
    try {
      const santri = santris.find(s => s.id === selectedSantri);
      if (santri) {
        const today = new Date().toISOString().split("T")[0];

        const { data: existingAbsen } = await supabase
          .from("absensis")
          .select("id")
          .eq("student_id", selectedSantri)
          .eq("teacher_id", pengajar.id)
          .gte("created_at", `${today}T00:00:00`)
          .lte("created_at", `${today}T23:59:59`)
          .maybeSingle();

        if (!existingAbsen) {
          const HARI_MAP = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
          const todayHari = HARI_MAP[new Date().getDay()];

          const { data: jadwal } = await supabase
            .from("jadwals")
            .select("id")
            .eq("pengajar_id", pengajar.id)
            .eq("hari", todayHari)
            .limit(1)
            .maybeSingle();

          if (jadwal) {
            let { data: pertemuan } = await supabase
              .from("pertemuans")
              .select("id")
              .eq("jadwal_id", jadwal.id)
              .eq("tanggal", today)
              .maybeSingle();

            if (!pertemuan) {
              const { data: newPertemuan } = await supabase
                .from("pertemuans")
                .insert({ jadwal_id: jadwal.id, group_id: santri.group_id, tanggal: today, status: "SELESAI", created_by: pengajar.id })
                .select("id")
                .single();
              pertemuan = newPertemuan;
            }

            if (pertemuan) {
              await supabase.from("absensis").upsert({
                meeting_id: pertemuan.id,
                student_id: selectedSantri,
                teacher_id: pengajar.id,
                status: "HADIR",
              }, { onConflict: "meeting_id,student_id" });
            }
          }
        }
      }
    } catch {
      // attendance failure must not hide the saved indicator
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setCatatanBacaan("");
  };

  const handleSaveHafalan = async () => {
    if (!selectedSantri || !user) return;
    setSaving(true);
    setSaved(false);

    const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
    if (!pengajar) { setSaving(false); return; }

    await supabase.from("perkembangan_santris").insert({
      student_id: selectedSantri,
      teacher_id: pengajar.id,
      tanggal: new Date().toISOString().split("T")[0],
      tipe_perkembangan: "HAFALAN",
      nama_surah: hafalanForm.nama_surah,
      penilaian: hafalanForm.penilaian,
      catatan: hafalanForm.catatan || null,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setHafalanForm({ nama_surah: "", penilaian: "BAIK", catatan: "" });
  };

  const handleSaveSholat = async () => {
    if (!selectedSantri || !user) return;
    setSaving(true);
    setSaved(false);

    const { data: pengajar } = await supabase.from("pengajars").select("id").eq("user_id", user.id).single();
    if (!pengajar) { setSaving(false); return; }

    await supabase.from("perkembangan_santris").insert({
      student_id: selectedSantri,
      teacher_id: pengajar.id,
      tanggal: new Date().toISOString().split("T")[0],
      tipe_perkembangan: "PRAKTIK_SHOLAT",
      jenis_sholat: sholatForm.jenis_sholat,
      penilaian: sholatForm.penilaian,
      catatan: sholatForm.catatan || null,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSholatForm({ jenis_sholat: "Subuh", penilaian: "BAIK", catatan: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pengajar" className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Input Perkembangan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catat perkembangan bacaan, hafalan, dan praktik sholat santri</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Pilih Kelas</Label>
          <Select value={selectedGroup} onValueChange={(v: string | null) => setSelectedGroup(v ?? "")} items={groups.map((g) => ({ label: g.nama_group, value: g.id }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
            <SelectContent>
              {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.nama_group}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Pilih Santri</Label>
          <Select value={selectedSantri} onValueChange={(v: string | null) => setSelectedSantri(v ?? "")} disabled={!selectedGroup} items={santris.map((s) => ({ label: s.nama, value: s.id }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Pilih santri" /></SelectTrigger>
            <SelectContent>
              {santris.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedSantri ? (
        <Tabs defaultValue="bacaan" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="bacaan" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Bacaan</TabsTrigger>
            <TabsTrigger value="hafalan" className="gap-1.5"><BookMarked className="h-3.5 w-3.5" /> Hafalan</TabsTrigger>
            <TabsTrigger value="sholat" className="gap-1.5"><Moon className="h-3.5 w-3.5" /> Praktik Sholat</TabsTrigger>
          </TabsList>

          <TabsContent value="bacaan" className="space-y-4 pt-4">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Perkembangan Bacaan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Jenis Bacaan</Label>
                  <Select value={jenisBacaan} onValueChange={(v: string | null) => v && setJenisBacaan(v)} items={[{ label: "Iqra", value: "IQRA" }, { label: "Al-Quran", value: "QURAN" }]}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IQRA">Iqra</SelectItem>
                      <SelectItem value="QURAN">Al-Quran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {jenisBacaan === "IQRA" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Iqra Ke-</Label>
                      <Select value={iqraForm.iqra_ke} onValueChange={(v: string | null) => setIqraForm({ ...iqraForm, iqra_ke: v ?? "" })} items={IQRA_OPTIONS.map(n => ({ label: `Iqra ${n}`, value: String(n) }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          {IQRA_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>Iqra {n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Halaman</Label>
                      <Input type="number" value={iqraForm.halaman} onChange={(e) => setIqraForm({ ...iqraForm, halaman: e.target.value })} className="h-9" placeholder="Nomor halaman" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Juz</Label>
                      <Select value={quranForm.juz} onValueChange={(v: string | null) => setQuranForm({ ...quranForm, juz: v ?? "" })} items={JUZ_OPTIONS.map(n => ({ label: `Juz ${n}`, value: String(n) }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Pilih juz" /></SelectTrigger>
                        <SelectContent>
                          {JUZ_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>Juz {n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Surah</Label>
                      <Input value={quranForm.surah} onChange={(e) => setQuranForm({ ...quranForm, surah: e.target.value })} className="h-9" placeholder="Ketik nama surah" list="surah-list" />
                      <datalist id="surah-list">
                        {SURAH_LIST.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Penilaian</Label>
                  <Select value={penilaianBacaan} onValueChange={(v: string | null) => v && setPenilaianBacaan(v)} items={PENILAIAN_OPTIONS}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PENILAIAN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
              <CardHeader>
                <CardTitle className="text-sm font-medium">Perkembangan Hafalan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Surah / Doa</Label>
                  <Input value={hafalanForm.nama_surah} onChange={(e) => setHafalanForm({ ...hafalanForm, nama_surah: e.target.value })} className="h-9" placeholder="Contoh: Al-Fatihah, Doa Sebelum Makan" list="surah-hafalan-list" />
                  <datalist id="surah-hafalan-list">
                    {SURAH_LIST.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label>Penilaian</Label>
                  <Select value={hafalanForm.penilaian} onValueChange={(v: string | null) => v && setHafalanForm({ ...hafalanForm, penilaian: v })} items={PENILAIAN_OPTIONS}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PENILAIAN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea value={hafalanForm.catatan} onChange={(e) => setHafalanForm({ ...hafalanForm, catatan: e.target.value })} placeholder="Tambahkan catatan..." className="min-h-[80px]" />
                </div>

                <Button onClick={handleSaveHafalan} disabled={saving} className="h-9 px-4">
                  {saving ? "Menyimpan..." : saved ? <><CheckCircle className="mr-2 h-4 w-4" /> Tersimpan</> : <><Save className="mr-2 h-4 w-4" /> Simpan</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sholat" className="space-y-4 pt-4">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Praktik Sholat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Jenis Sholat</Label>
                  <Select value={sholatForm.jenis_sholat} onValueChange={(v: string | null) => v && setSholatForm({ ...sholatForm, jenis_sholat: v })} items={SHOLAT_OPTIONS.map(s => ({ label: s, value: s }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHOLAT_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Penilaian</Label>
                  <Select value={sholatForm.penilaian} onValueChange={(v: string | null) => v && setSholatForm({ ...sholatForm, penilaian: v })} items={PENILAIAN_OPTIONS}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PENILAIAN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea value={sholatForm.catatan} onChange={(e) => setSholatForm({ ...sholatForm, catatan: e.target.value })} placeholder="Tambahkan catatan..." className="min-h-[80px]" />
                </div>

                <Button onClick={handleSaveSholat} disabled={saving} className="h-9 px-4">
                  {saving ? "Menyimpan..." : saved ? <><CheckCircle className="mr-2 h-4 w-4" /> Tersimpan</> : <><Save className="mr-2 h-4 w-4" /> Simpan</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : selectedGroup ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Pilih santri untuk mulai input perkembangan</p>
        </div>
      ) : null}
    </div>
  );
}
