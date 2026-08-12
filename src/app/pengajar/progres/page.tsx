"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Save, BookOpen, BookMarked, Mic, ClipboardCheck, UserX } from "lucide-react";

interface Santri { id: string; nama: string; }
interface Group { id: string; nama_group: string; }

export default function ProgresPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [santris, setSantris] = useState<Santri[]>([]);
  const [selectedSantri, setSelectedSantri] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const [iqraForm, setIqraForm] = useState({ iqra_ke: "", halaman: "" });
  const [quranForm, setQuranForm] = useState({ surah: "", ayat_mulai: "", ayat_selesai: "", juz: "" });
  const [hafalanForm, setHafalanForm] = useState({ nama_surah: "", status: "LANCAR", nilai: "" });
  const [doaForm, setDoaForm] = useState({ nama_doa: "", status: "LANCAR", nilai: "" });

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
      const { data } = await supabase.from("santris").select("id, nama").eq("group_id", selectedGroup).order("nama");
      setSantris(data ?? []);
      setSelectedSantri("");
    };
    fetchSantris();
  }, [selectedGroup]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Input Progres</h1>
        <p className="mt-1 text-sm text-muted-foreground">Input progres bacaan santri</p>
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
        <Tabs defaultValue="iqra" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-10">
            <TabsTrigger value="iqra" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> IQRA</TabsTrigger>
            <TabsTrigger value="quran" className="gap-1.5"><BookMarked className="h-3.5 w-3.5" /> Quran</TabsTrigger>
            <TabsTrigger value="hafalan" className="gap-1.5"><Mic className="h-3.5 w-3.5" /> Hafalan</TabsTrigger>
            <TabsTrigger value="doa" className="gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" /> Doa</TabsTrigger>
          </TabsList>

          <TabsContent value="iqra" className="space-y-4 pt-4">
            <Card className="card-elevated">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IQRA Ke-</Label>
                    <Input type="number" value={iqraForm.iqra_ke} onChange={(e) => setIqraForm({ ...iqraForm, iqra_ke: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Halaman</Label>
                    <Input type="number" value={iqraForm.halaman} onChange={(e) => setIqraForm({ ...iqraForm, halaman: e.target.value })} className="h-9" />
                  </div>
                </div>
                <Button className="h-9 px-4" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> Simpan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quran" className="space-y-4 pt-4">
            <Card className="card-elevated">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Surah</Label>
                    <Input value={quranForm.surah} onChange={(e) => setQuranForm({ ...quranForm, surah: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Juz</Label>
                    <Input type="number" value={quranForm.juz} onChange={(e) => setQuranForm({ ...quranForm, juz: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ayat Mulai</Label>
                    <Input type="number" value={quranForm.ayat_mulai} onChange={(e) => setQuranForm({ ...quranForm, ayat_mulai: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ayat Selesai</Label>
                    <Input type="number" value={quranForm.ayat_selesai} onChange={(e) => setQuranForm({ ...quranForm, ayat_selesai: e.target.value })} className="h-9" />
                  </div>
                </div>
                <Button className="h-9 px-4" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> Simpan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hafalan" className="space-y-4 pt-4">
            <Card className="card-elevated">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Surah</Label>
                    <Input value={hafalanForm.nama_surah} onChange={(e) => setHafalanForm({ ...hafalanForm, nama_surah: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Hafalan</Label>
                    <Select value={hafalanForm.status} onValueChange={(v: string | null) => v && setHafalanForm({ ...hafalanForm, status: v })} items={[{ label: "Lancar", value: "LANCAR" }, { label: "Kurang Lancar", value: "KURANG_LANCAR" }, { label: "Tidak Lancar", value: "TIDAK_LANCAR" }]}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LANCAR">Lancar</SelectItem>
                        <SelectItem value="KURANG_LANCAR">Kurang Lancar</SelectItem>
                        <SelectItem value="TIDAK_LANCAR">Tidak Lancar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nilai (0-100)</Label>
                    <Input type="number" min="0" max="100" value={hafalanForm.nilai} onChange={(e) => setHafalanForm({ ...hafalanForm, nilai: e.target.value })} className="h-9" />
                  </div>
                </div>
                <Button className="h-9 px-4" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> Simpan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="doa" className="space-y-4 pt-4">
            <Card className="card-elevated">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Doa</Label>
                    <Input value={doaForm.nama_doa} onChange={(e) => setDoaForm({ ...doaForm, nama_doa: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Hafalan</Label>
                    <Select value={doaForm.status} onValueChange={(v: string | null) => v && setDoaForm({ ...doaForm, status: v })} items={[{ label: "Lancar", value: "LANCAR" }, { label: "Kurang Lancar", value: "KURANG_LANCAR" }, { label: "Tidak Lancar", value: "TIDAK_LANCAR" }]}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LANCAR">Lancar</SelectItem>
                        <SelectItem value="KURANG_LANCAR">Kurang Lancar</SelectItem>
                        <SelectItem value="TIDAK_LANCAR">Tidak Lancar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nilai (0-100)</Label>
                    <Input type="number" min="0" max="100" value={doaForm.nilai} onChange={(e) => setDoaForm({ ...doaForm, nilai: e.target.value })} className="h-9" />
                  </div>
                </div>
                <Button className="h-9 px-4" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> Simpan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : selectedGroup ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <UserX className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Pilih santri untuk mulai input progres</p>
        </div>
      ) : null}
    </div>
  );
}