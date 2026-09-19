"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Calendar, Clock, Phone, MapPin, Users, CalendarDays, Wallet, GraduationCap, Briefcase, Link2, UserX } from "lucide-react";
import { formatGender, formatSesi, formatTingkat, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";

interface Santri {
  id: string;
  nama: string;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  alamat: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
  no_hp_wali: string | null;
  pekerjaan_ayah: string | null;
  pekerjaan_ibu: string | null;
  iuran: number | null;
  keterangan: string | null;
  pendidikan_saat_ini: string | null;
  kelompok?: { nama: string; sesi?: { nama: string } | null } | null;
}

export default function AnakPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [santris, setSantris] = useState<Santri[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [namaSantri, setNamaSantri] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [hubungan, setHubungan] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const fetchSantris = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("santri")
      .select("*, kelompok(nama, sesi(nama))")
      .order("nama");
    if (error) {
      setError("Data anak tidak dapat dimuat. Silakan coba lagi.");
      setSantris([]);
    } else {
      setSantris((data ?? []) as unknown as Santri[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchSantris();
  }, [user]);

  const openLinkDialog = () => {
    setLinkError(null);
    setLinkSuccess(null);
    setLinkDialogOpen(true);
  };

  const handleLinkSantri = async (event: React.FormEvent) => {
    event.preventDefault();
    if (linkLoading) return;

    const nama = namaSantri.trim();
    setLinkError(null);
    setLinkSuccess(null);
    if (!nama) {
      setLinkError("Nama lengkap santri wajib diisi.");
      return;
    }
    if (!tanggalLahir) {
      setLinkError("Tanggal lahir santri wajib diisi.");
      return;
    }
    if (!hubungan) {
      setLinkError("Pilih hubungan Anda dengan santri.");
      return;
    }

    setLinkLoading(true);
    const { data, error: rpcError } = await supabase.rpc("link_santri_by_identity", {
      p_nama: nama,
      p_tanggal_lahir: tanggalLahir,
      p_hubungan: hubungan,
    });
    setLinkLoading(false);

    if (rpcError) {
      setLinkError("Anak belum dapat dihubungkan. Silakan periksa data dan coba lagi.");
      return;
    }

    if (data === "linked") {
      setNamaSantri("");
      setTanggalLahir("");
      setHubungan("");
      setLinkDialogOpen(false);
      setLinkSuccess("Anak berhasil dihubungkan.");
      await fetchSantris();
      window.setTimeout(() => router.replace("/orang-tua"), 700);
      return;
    }
    if (data === "already_linked") {
      setLinkError("Anak tersebut sudah terhubung dengan akun ini.");
      return;
    }
    if (data === "not_found" || data === "ambiguous") {
      setLinkError("Data santri tidak ditemukan atau belum dapat diverifikasi.");
      return;
    }

    setLinkError("Anak belum dapat dihubungkan. Silakan periksa data dan coba lagi.");
  };

  if (loading) return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  if (error) return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center sm:p-12">
      <UserX className="mx-auto h-10 w-10 text-destructive/60 mb-3" />
      <p className="text-sm text-destructive">{error}</p>
    </div>
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={santris.length === 0 ? "Mulai sebagai orang tua" : "Profil santri"}
        title={santris.length === 0 ? "Hubungkan data anak" : "Data anak"}
        description={santris.length === 0 ? "Cocokkan data anak yang sudah terdaftar di TPA untuk mulai memantau perkembangannya." : "Informasi pendidikan dan kontak yang tersimpan."}
        action={<Button onClick={openLinkDialog} className="h-9 px-4"><Link2 className="mr-2 h-4 w-4" />Hubungkan Anak</Button>}
      />

      {linkSuccess && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{linkSuccess}</p>}

      {santris.length === 0 ? (
        <EmptyState
          message="Belum ada anak yang terhubung dengan akun ini."
          hint="Hubungkan anak Anda menggunakan nama lengkap dan tanggal lahir yang terdaftar."
          action={<Button onClick={openLinkDialog}><Link2 className="mr-2 h-4 w-4" />Hubungkan Anak</Button>}
        />
      ) : (
        <div className="grid gap-6">
          {santris.map((santri) => {
          const sesi = santri.kelompok?.sesi?.nama === "PAGI" ? "PAGI" : santri.kelompok?.sesi?.nama === "SORE" ? "SORE" : "";
          const formatIuran = (n: number | null) => (n ? `Rp ${n.toLocaleString("id-ID")}` : "-");
          const schoolInfo = [
            { label: "Sesi", value: formatSesi(sesi), icon: Clock },
            { label: "Kelompok", value: santri.kelompok?.nama ?? "-", icon: Users },
            { label: "Jenis Bacaan", value: formatTingkat(santri.keterangan ?? ""), icon: CalendarDays },
            { label: "Pendidikan Saat Ini", value: santri.pendidikan_saat_ini ?? "-", icon: GraduationCap },
          ];
          const personalInfo = [
            { label: "Jenis Kelamin", value: formatGender(santri.jenis_kelamin), icon: User },
            { label: "Tanggal Lahir", value: santri.tanggal_lahir ? formatDate(santri.tanggal_lahir) : "-", icon: Calendar },
            { label: "Alamat", value: santri.alamat ?? "-", icon: MapPin },
            { label: "Iuran/Infaq Bulanan", value: formatIuran(santri.iuran), icon: Wallet },
          ];
          const parentInfo = [
            { label: "Nama Ayah", value: santri.nama_ayah ?? "-", icon: Users },
            { label: "Pekerjaan Ayah", value: santri.pekerjaan_ayah ?? "-", icon: Briefcase },
            { label: "Nama Ibu", value: santri.nama_ibu ?? "-", icon: Users },
            { label: "Pekerjaan Ibu", value: santri.pekerjaan_ibu ?? "-", icon: Briefcase },
            { label: "No. HP Wali", value: santri.no_hp_wali ?? "-", icon: Phone },
          ];

          return (
            <Card key={santri.id} className="surface-panel overflow-hidden">
              <div className="h-1.5 bg-primary/70" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">{santri.nama}</CardTitle>
                  <Badge variant="outline" className="text-xs">{formatGender(santri.jenis_kelamin)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <InfoSection title="Informasi Kelas" items={schoolInfo} />
                <InfoSection title="Informasi Pribadi" items={personalInfo} bordered />
                <InfoSection title="Informasi Orang Tua" items={parentInfo} bordered />
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hubungkan Anak</DialogTitle>
            <p className="text-sm leading-6 text-muted-foreground">Masukkan data anak sesuai yang terdaftar di TPA.</p>
          </DialogHeader>
          <form onSubmit={handleLinkSantri} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama-santri">Nama Lengkap Santri</Label>
              <Input id="nama-santri" value={namaSantri} onChange={(event) => setNamaSantri(event.target.value)} placeholder="Nama lengkap santri" disabled={linkLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tanggal-lahir">Tanggal Lahir</Label>
              <Input id="tanggal-lahir" type="date" value={tanggalLahir} onChange={(event) => setTanggalLahir(event.target.value)} disabled={linkLoading} />
            </div>
            <div className="space-y-2">
              <Label>Hubungan</Label>
              <Select value={hubungan || null} onValueChange={(value) => setHubungan(value ?? "")} items={[{ label: "Ayah", value: "Ayah" }, { label: "Ibu", value: "Ibu" }, { label: "Wali", value: "Wali" }]} disabled={linkLoading}>
                <SelectTrigger><SelectValue placeholder="Pilih hubungan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ayah">Ayah</SelectItem>
                  <SelectItem value="Ibu">Ibu</SelectItem>
                  <SelectItem value="Wali">Wali</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {linkError && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{linkError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)} disabled={linkLoading}>Batal</Button>
              <Button type="submit" disabled={linkLoading}>{linkLoading ? "Menghubungkan..." : "Hubungkan Anak"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoSection({ title, items, bordered = false }: { title: string; items: { label: string; value: string; icon: typeof User }[]; bordered?: boolean }) {
  return (
    <div className={bordered ? "border-t border-border pt-6" : undefined}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="mt-0.5 text-sm font-medium text-foreground">{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
