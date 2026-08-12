"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BookMarked, Mic, Calendar } from "lucide-react";
import { formatStatus, formatDate, getStatusBadgeVariant } from "@/lib/format";

interface Progres {
  id: string;
  created_at: string;
  tipe_bacaan: string | null;
  surah: string | null;
  ayat_mulai: number | null;
  ayat_selesai: number | null;
  halaman_iqra: number | null;
  iqra_ke: number | null;
  catatan: string | null;
}

interface Hafalan {
  id: string;
  created_at: string;
  nama_surah: string;
  status: string;
  nilai: number;
}

interface Doa {
  id: string;
  created_at: string;
  nama_doa: string;
  status: string;
  nilai: number;
}

export default function OrangTuaProgresPage() {
  const { user } = useAuth();
  const [progresList, setProgresList] = useState<Progres[]>([]);
  const [hafalanList, setHafalanList] = useState<Hafalan[]>([]);
  const [doaList, setDoaList] = useState<Doa[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: orangTua } = await supabase.from("orang_tuas").select("santri_id").eq("user_id", user.id).single();
      if (!orangTua) { setLoading(false); return; }

      const [progres, hafalan, doa] = await Promise.all([
        supabase.from("progres_bacaans").select("*").eq("student_id", orangTua.santri_id).order("created_at", { ascending: false }),
        supabase.from("hafalans").select("*").eq("student_id", orangTua.santri_id).order("created_at", { ascending: false }),
        supabase.from("doa_harians").select("*").eq("student_id", orangTua.santri_id).order("created_at", { ascending: false }),
      ]);

      setProgresList(progres.data ?? []);
      setHafalanList(hafalan.data ?? []);
      setDoaList(doa.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const emptyState = (icon: React.ReactNode, text: string) => (
    <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Progres Anak</h1>
        <p className="mt-1 text-sm text-muted-foreground">Riwayat progres bacaan dan hafalan</p>
      </div>

      <Tabs defaultValue="progres" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="progres" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Bacaan</TabsTrigger>
          <TabsTrigger value="hafalan" className="gap-1.5"><BookMarked className="h-3.5 w-3.5" /> Hafalan</TabsTrigger>
          <TabsTrigger value="doa" className="gap-1.5"><Mic className="h-3.5 w-3.5" /> Doa</TabsTrigger>
        </TabsList>

        <TabsContent value="progres" className="space-y-3 pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : progresList.length === 0 ? (
            emptyState(<BookOpen className="h-6 w-6 text-muted-foreground/50" />, "Belum ada data progres")
          ) : (
            progresList.map((p) => (
              <Card key={p.id} className="card-elevated card-elevated-hover">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {p.tipe_bacaan === "IQRA" ? `IQRA ${p.iqra_ke} Hal. ${p.halaman_iqra}` : `${p.surah} Ayat ${p.ayat_mulai}-${p.ayat_selesai}`}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(p.created_at)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{p.tipe_bacaan ?? "Bacaan"}</Badge>
                  </div>
                  {p.catatan && <p className="mt-2 text-sm text-muted-foreground">{p.catatan}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="hafalan" className="space-y-3 pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : hafalanList.length === 0 ? (
            emptyState(<BookMarked className="h-6 w-6 text-muted-foreground/50" />, "Belum ada data hafalan")
          ) : (
            hafalanList.map((h) => (
              <Card key={h.id} className="card-elevated card-elevated-hover">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{h.nama_surah}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(h.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(h.status)}>{formatStatus(h.status)}</Badge>
                      <span className="text-xl font-bold tracking-tight text-foreground font-tabular">{h.nilai}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="doa" className="space-y-3 pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : doaList.length === 0 ? (
            emptyState(<Mic className="h-6 w-6 text-muted-foreground/50" />, "Belum ada data doa")
          ) : (
            doaList.map((d) => (
              <Card key={d.id} className="card-elevated card-elevated-hover">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{d.nama_doa}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(d.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(d.status)}>{formatStatus(d.status)}</Badge>
                      <span className="text-xl font-bold tracking-tight text-foreground font-tabular">{d.nilai}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}