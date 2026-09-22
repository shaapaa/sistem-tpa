-- ============================================
-- DATABASE SCHEMA SNAPSHOT
-- Struktur jadwal sesi ditambahkan dari migration repository. Snapshot penuh
-- harus diregenerate dari database setelah migration 20260921000016--20260922000019 diterapkan.
-- Sistem Monitoring TPA Baitul Yatama
-- ============================================

create table doa (
  id uuid default gen_random_uuid() not null,
  nama text not null,
  aktif boolean default true,
  created_at timestamp with time zone default now()
);

create table hafalan_santri (
  id uuid default gen_random_uuid() not null,
  santri_id uuid not null,
  surat_id uuid not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table hafalan_surat_cicilan (
  id uuid default gen_random_uuid() not null,
  hafalan_santri_id uuid not null,
  pengajar_id uuid,
  tanggal date default CURRENT_DATE not null,
  ayat_mulai integer not null,
  ayat_selesai integer not null,
  status text,
  jenis text default 'setoran_baru'::text not null,
  catatan text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table jadwal (
  id uuid default gen_random_uuid() not null,
  kelompok_id uuid not null,
  hari text not null,
  jam_mulai time without time zone,
  jam_selesai time without time zone,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Struktur penjadwalan sesi yang berlaku setelah migrasi September 2026.
create table jadwal_sesi (
  id uuid default gen_random_uuid() not null,
  sesi_id uuid not null,
  hari text not null,
  jam_mulai time without time zone not null,
  jam_selesai time without time zone not null,
  is_active boolean not null default true,
  pengajar_id uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id),
  unique (sesi_id, hari)
);

create table jadwal_sesi_pengajar (
  id uuid default gen_random_uuid() not null,
  jadwal_sesi_id uuid not null,
  pengajar_id uuid not null,
  created_at timestamp with time zone not null default now(),
  primary key (id),
  unique (jadwal_sesi_id, pengajar_id)
);

create table jenis_salat (
  id uuid default gen_random_uuid() not null,
  nama text not null,
  aktif boolean default true,
  created_at timestamp with time zone default now()
);

create table kelompok (
  id uuid default gen_random_uuid() not null,
  sesi_id uuid not null,
  nama text not null,
  pengajar_id uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table komponen_salat (
  id uuid default gen_random_uuid() not null,
  nama text not null,
  aktif boolean default true,
  created_at timestamp with time zone default now()
);

create table pengajar (
  id uuid default gen_random_uuid() not null,
  profile_id uuid,
  nama text not null,
  jenis_kelamin text,
  no_hp text,
  alamat text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table perkembangan_bacaan (
  id uuid default gen_random_uuid() not null,
  santri_id uuid not null,
  pengajar_id uuid,
  tanggal date default CURRENT_DATE not null,
  jenis_bacaan text not null,
  jilid integer,
  halaman integer,
  juz integer,
  surat_id uuid,
  ayat_mulai integer,
  ayat_selesai integer,
  status text,
  catatan text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table perkembangan_hafalan_doa (
  id uuid default gen_random_uuid() not null,
  santri_id uuid not null,
  doa_id uuid not null,
  pengajar_id uuid,
  tanggal date default CURRENT_DATE not null,
  status text,
  catatan text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table perkembangan_salat_komponen (
  id uuid default gen_random_uuid() not null,
  santri_id uuid not null,
  komponen_salat_id uuid not null,
  pengajar_id uuid,
  tanggal date default CURRENT_DATE not null,
  status text,
  catatan text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table praktik_salat (
  id uuid default gen_random_uuid() not null,
  santri_id uuid not null,
  jenis_salat_id uuid,
  pengajar_id uuid,
  tanggal date default CURRENT_DATE not null,
  status text,
  catatan text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table presensi (
  id uuid default gen_random_uuid() not null,
  santri_id uuid not null,
  kelompok_id uuid,
  pengajar_id uuid,
  tanggal date not null,
  status text not null,
  keterangan text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table profiles (
  id uuid not null,
  nama text default ''::text not null,
  role text not null,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table santri (
  id uuid default gen_random_uuid() not null,
  profile_id uuid,
  kelompok_id uuid,
  nama text not null,
  jenis_kelamin text,
  tanggal_lahir date,
  alamat text,
  nama_ayah text,
  nama_ibu text,
  no_hp_wali text,
  pekerjaan_ayah text,
  pekerjaan_ibu text,
  iuran numeric default 0,
  keterangan text,
  pendidikan_saat_ini text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table sesi (
  id uuid default gen_random_uuid() not null,
  nama text not null,
  created_at timestamp with time zone default now()
);

create table surat (
  id uuid default gen_random_uuid() not null,
  nomor integer not null,
  nama text not null,
  jumlah_ayat integer not null,
  juz integer not null,
  aktif boolean default true,
  created_at timestamp with time zone default now()
);

alter table doa add primary key  (id);
alter table doa add constraint doa_nama_key unique (nama);

alter table hafalan_santri add constraint hafalan_santri_santri_id_fkey foreign key  (santri_id) REFERENCES santri(id) ON DELETE CASCADE;
alter table hafalan_santri add constraint hafalan_santri_surat_id_fkey foreign key  (surat_id) REFERENCES surat(id) ON DELETE CASCADE;
alter table hafalan_santri add primary key  (id);
alter table hafalan_santri add constraint hafalan_santri_santri_id_surat_id_key unique (santri_id, surat_id);

alter table hafalan_surat_cicilan add constraint hafalan_surat_cicilan_check check  ((ayat_selesai >= ayat_mulai));
alter table hafalan_surat_cicilan add constraint hafalan_surat_cicilan_jenis_check check  ((jenis = ANY (ARRAY['setoran_baru'::text, 'evaluasi'::text])));
alter table hafalan_surat_cicilan add constraint hafalan_surat_cicilan_status_check check  ((status = ANY (ARRAY['LANCAR'::text, 'KURANG_LANCAR'::text, 'TIDAK_LANCAR'::text])));
alter table hafalan_surat_cicilan add constraint hafalan_surat_cicilan_hafalan_santri_id_fkey foreign key  (hafalan_santri_id) REFERENCES hafalan_santri(id) ON DELETE CASCADE;
alter table hafalan_surat_cicilan add constraint hafalan_surat_cicilan_pengajar_id_fkey foreign key  (pengajar_id) REFERENCES pengajar(id) ON DELETE SET NULL;
alter table hafalan_surat_cicilan add primary key  (id);

alter table jadwal add constraint jadwal_hari_check check  ((hari = ANY (ARRAY['SENIN'::text, 'SELASA'::text, 'RABU'::text, 'KAMIS'::text, 'JUMAT'::text])));
alter table jadwal add constraint jadwal_kelompok_id_fkey foreign key  (kelompok_id) REFERENCES kelompok(id) ON DELETE CASCADE;
alter table jadwal add primary key  (id);
alter table jadwal add constraint jadwal_kelompok_id_hari_key unique (kelompok_id, hari);

alter table jenis_salat add primary key  (id);
alter table jenis_salat add constraint jenis_salat_nama_key unique (nama);

alter table kelompok add constraint kelompok_nama_check check  ((nama = ANY (ARRAY['A'::text, 'B'::text])));
alter table kelompok add constraint kelompok_pengajar_id_fkey foreign key  (pengajar_id) REFERENCES pengajar(id) ON DELETE SET NULL;
alter table kelompok add constraint kelompok_sesi_id_fkey foreign key  (sesi_id) REFERENCES sesi(id) ON DELETE RESTRICT;
alter table kelompok add primary key  (id);
alter table kelompok add constraint kelompok_sesi_id_nama_key unique (sesi_id, nama);

alter table komponen_salat add primary key  (id);
alter table komponen_salat add constraint komponen_salat_nama_key unique (nama);

alter table pengajar add constraint pengajar_jenis_kelamin_check check  ((jenis_kelamin = ANY (ARRAY['LAKI_LAKI'::text, 'PEREMPUAN'::text])));
alter table pengajar add constraint pengajar_profile_id_fkey foreign key  (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table pengajar add primary key  (id);
alter table pengajar add constraint pengajar_profile_id_key unique (profile_id);

alter table perkembangan_bacaan add constraint perkembangan_bacaan_jenis_bacaan_check check  ((jenis_bacaan = ANY (ARRAY['IQRA'::text, 'QURAN'::text])));
alter table perkembangan_bacaan add constraint perkembangan_bacaan_jilid_check check  (((jilid >= 1) AND (jilid <= 6)));
alter table perkembangan_bacaan add constraint perkembangan_bacaan_juz_check check  (((juz >= 1) AND (juz <= 30)));
alter table perkembangan_bacaan add constraint perkembangan_bacaan_status_check check  ((status = ANY (ARRAY['LANCAR'::text, 'KURANG_LANCAR'::text, 'TIDAK_LANCAR'::text])));
alter table perkembangan_bacaan add constraint perkembangan_bacaan_pengajar_id_fkey foreign key  (pengajar_id) REFERENCES pengajar(id) ON DELETE SET NULL;
alter table perkembangan_bacaan add constraint perkembangan_bacaan_santri_id_fkey foreign key  (santri_id) REFERENCES santri(id) ON DELETE CASCADE;
alter table perkembangan_bacaan add constraint perkembangan_bacaan_surat_id_fkey foreign key  (surat_id) REFERENCES surat(id) ON DELETE SET NULL;
alter table perkembangan_bacaan add primary key  (id);

alter table perkembangan_hafalan_doa add constraint perkembangan_hafalan_doa_status_check check  ((status = ANY (ARRAY['LANCAR'::text, 'KURANG_LANCAR'::text, 'TIDAK_LANCAR'::text])));
alter table perkembangan_hafalan_doa add constraint perkembangan_hafalan_doa_doa_id_fkey foreign key  (doa_id) REFERENCES doa(id) ON DELETE CASCADE;
alter table perkembangan_hafalan_doa add constraint perkembangan_hafalan_doa_pengajar_id_fkey foreign key  (pengajar_id) REFERENCES pengajar(id) ON DELETE SET NULL;
alter table perkembangan_hafalan_doa add constraint perkembangan_hafalan_doa_santri_id_fkey foreign key  (santri_id) REFERENCES santri(id) ON DELETE CASCADE;
alter table perkembangan_hafalan_doa add primary key  (id);

alter table perkembangan_salat_komponen add constraint perkembangan_salat_komponen_status_check check  ((status = ANY (ARRAY['LANCAR'::text, 'BUTUH_BIMBINGAN'::text])));
alter table perkembangan_salat_komponen add constraint perkembangan_salat_komponen_komponen_salat_id_fkey foreign key  (komponen_salat_id) REFERENCES komponen_salat(id) ON DELETE CASCADE;
alter table perkembangan_salat_komponen add constraint perkembangan_salat_komponen_pengajar_id_fkey foreign key  (pengajar_id) REFERENCES pengajar(id) ON DELETE SET NULL;
alter table perkembangan_salat_komponen add constraint perkembangan_salat_komponen_santri_id_fkey foreign key  (santri_id) REFERENCES santri(id) ON DELETE CASCADE;
alter table perkembangan_salat_komponen add primary key  (id);

alter table praktik_salat add constraint praktik_salat_status_check check  ((status = ANY (ARRAY['LANCAR'::text, 'BUTUH_BIMBINGAN'::text])));
alter table praktik_salat add constraint praktik_salat_jenis_salat_id_fkey foreign key  (jenis_salat_id) REFERENCES jenis_salat(id) ON DELETE SET NULL;
alter table praktik_salat add constraint praktik_salat_pengajar_id_fkey foreign key  (pengajar_id) REFERENCES pengajar(id) ON DELETE SET NULL;
alter table praktik_salat add constraint praktik_salat_santri_id_fkey foreign key  (santri_id) REFERENCES santri(id) ON DELETE CASCADE;
alter table praktik_salat add primary key  (id);

alter table presensi add constraint presensi_status_check check  ((status = ANY (ARRAY['HADIR'::text, 'IZIN'::text, 'SAKIT'::text, 'ALPHA'::text])));
alter table presensi add constraint presensi_kelompok_id_fkey foreign key  (kelompok_id) REFERENCES kelompok(id) ON DELETE SET NULL;
alter table presensi add constraint presensi_pengajar_id_fkey foreign key  (pengajar_id) REFERENCES pengajar(id) ON DELETE SET NULL;
alter table presensi add constraint presensi_santri_id_fkey foreign key  (santri_id) REFERENCES santri(id) ON DELETE CASCADE;
alter table presensi add primary key  (id);
alter table presensi add constraint presensi_santri_id_tanggal_key unique (santri_id, tanggal);

alter table profiles add constraint profiles_role_check check  ((role = ANY (ARRAY['ADMIN'::text, 'PENGAJAR'::text, 'SANTRI'::text])));
alter table profiles add constraint profiles_id_fkey foreign key  (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table profiles add primary key  (id);

alter table santri add constraint santri_jenis_kelamin_check check  ((jenis_kelamin = ANY (ARRAY['LAKI_LAKI'::text, 'PEREMPUAN'::text])));
alter table santri add constraint santri_keterangan_check check  ((keterangan = ANY (ARRAY['IQRA'::text, 'QURAN'::text])));
alter table santri add constraint santri_kelompok_id_fkey foreign key  (kelompok_id) REFERENCES kelompok(id) ON DELETE SET NULL;
alter table santri add constraint santri_profile_id_fkey foreign key  (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table santri add primary key  (id);
alter table santri add constraint santri_profile_id_key unique (profile_id);

alter table sesi add constraint sesi_nama_check check  ((nama = ANY (ARRAY['PAGI'::text, 'SORE'::text])));
alter table sesi add primary key  (id);
alter table sesi add constraint sesi_nama_key unique (nama);

alter table surat add constraint surat_jumlah_ayat_check check  ((jumlah_ayat > 0));
alter table surat add primary key  (id);
alter table surat add constraint surat_nama_key unique (nama);
alter table surat add constraint surat_nomor_key unique (nomor);

CREATE INDEX idx_hafalan_santri ON public.hafalan_santri USING btree (santri_id);
CREATE INDEX idx_cicilan_hafalan ON public.hafalan_surat_cicilan USING btree (hafalan_santri_id);
CREATE INDEX idx_jadwal_kelompok ON public.jadwal USING btree (kelompok_id);
CREATE INDEX idx_pengajar_profile ON public.pengajar USING btree (profile_id);
CREATE INDEX idx_bacaan_santri ON public.perkembangan_bacaan USING btree (santri_id);
CREATE INDEX idx_bacaan_tanggal ON public.perkembangan_bacaan USING btree (tanggal);
CREATE INDEX idx_hafalan_doa_santri ON public.perkembangan_hafalan_doa USING btree (santri_id);
CREATE INDEX idx_salat_komponen_santri ON public.perkembangan_salat_komponen USING btree (santri_id);
CREATE INDEX idx_praktik_salat_santri ON public.praktik_salat USING btree (santri_id);
CREATE INDEX idx_presensi_kelompok ON public.presensi USING btree (kelompok_id);
CREATE INDEX idx_presensi_santri_tanggal ON public.presensi USING btree (santri_id, tanggal);
CREATE INDEX idx_santri_kelompok ON public.santri USING btree (kelompok_id);

CREATE OR REPLACE FUNCTION public.anak_santri_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select id from santri where profile_id = auth.uid() limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.pengajar_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select id from pengajar where profile_id = auth.uid() limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.pengajar_kelompok_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select coalesce(array_agg(id), '{}')
  from kelompok
  where pengajar_id = public.pengajar_id();
$function$
;

CREATE OR REPLACE FUNCTION public.pengajar_santri_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select coalesce(array_agg(id), '{}')
  from santri
  where kelompok_id = any(public.pengajar_kelompok_ids());
$function$
;

CREATE OR REPLACE FUNCTION public.user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select role from profiles where id = auth.uid() limit 1;
$function$
;

-- ROW LEVEL SECURITY
alter table doa enable row level security;
alter table hafalan_santri enable row level security;
alter table hafalan_surat_cicilan enable row level security;
alter table jadwal enable row level security;
alter table jenis_salat enable row level security;
alter table kelompok enable row level security;
alter table komponen_salat enable row level security;
alter table pengajar enable row level security;
alter table perkembangan_bacaan enable row level security;
alter table perkembangan_hafalan_doa enable row level security;
alter table perkembangan_salat_komponen enable row level security;
alter table praktik_salat enable row level security;
alter table presensi enable row level security;
alter table profiles enable row level security;
alter table santri enable row level security;
alter table sesi enable row level security;
alter table surat enable row level security;

create policy "Admin doa" on doa  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read doa" on doa for select using ((user_role() = ANY (ARRAY['ADMIN'::text, 'PENGAJAR'::text, 'SANTRI'::text])));
create policy "Admin read hafalan_santri" on hafalan_santri for select using ((user_role() = 'ADMIN'::text));
create policy "Pengajar hafalan_santri" on hafalan_santri  using (((user_role() = 'PENGAJAR'::text) AND (santri_id = ANY (pengajar_santri_ids()))));
create policy "Santri read hafalan_santri" on hafalan_santri for select using (((user_role() = 'SANTRI'::text) AND (santri_id = anak_santri_id())));
create policy "Admin read cicilan" on hafalan_surat_cicilan for select using ((user_role() = 'ADMIN'::text));
create policy "Pengajar cicilan" on hafalan_surat_cicilan  using (((user_role() = 'PENGAJAR'::text) AND (hafalan_santri_id IN ( SELECT hafalan_santri.id
   FROM hafalan_santri
  WHERE (hafalan_santri.santri_id = ANY (pengajar_santri_ids()))))));
create policy "Santri read cicilan" on hafalan_surat_cicilan for select using (((user_role() = 'SANTRI'::text) AND (hafalan_santri_id IN ( SELECT hafalan_santri.id
   FROM hafalan_santri
  WHERE (hafalan_santri.santri_id = anak_santri_id())))));
create policy "Admin jadwal" on jadwal  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read jadwal" on jadwal for select using (((user_role() = 'PENGAJAR'::text) AND (kelompok_id = ANY (pengajar_kelompok_ids()))));
create policy "Santri read jadwal" on jadwal for select using (((user_role() = 'SANTRI'::text) AND (kelompok_id = ( SELECT santri.kelompok_id
   FROM santri
  WHERE (santri.id = anak_santri_id())))));
create policy "Admin jenis_salat" on jenis_salat  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read jenis_salat" on jenis_salat for select using ((user_role() = ANY (ARRAY['ADMIN'::text, 'PENGAJAR'::text, 'SANTRI'::text])));
create policy "Admin kelompok" on kelompok  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read kelompok" on kelompok for select using (((user_role() = 'PENGAJAR'::text) AND (id = ANY (pengajar_kelompok_ids()))));
create policy "Santri read kelompok" on kelompok for select using (((user_role() = 'SANTRI'::text) AND (id = ( SELECT santri.kelompok_id
   FROM santri
  WHERE (santri.id = anak_santri_id())))));
create policy "Admin komponen_salat" on komponen_salat  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read komponen_salat" on komponen_salat for select using ((user_role() = ANY (ARRAY['ADMIN'::text, 'PENGAJAR'::text, 'SANTRI'::text])));
create policy "Admin pengajar" on pengajar  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read pengajar" on pengajar for select using ((user_role() = 'PENGAJAR'::text));
create policy "Santri read pengajar" on pengajar for select using ((user_role() = 'SANTRI'::text));
create policy "Admin read bacaan" on perkembangan_bacaan for select using ((user_role() = 'ADMIN'::text));
create policy "Pengajar bacaan" on perkembangan_bacaan  using (((user_role() = 'PENGAJAR'::text) AND (santri_id = ANY (pengajar_santri_ids()))));
create policy "Santri read bacaan" on perkembangan_bacaan for select using (((user_role() = 'SANTRI'::text) AND (santri_id = anak_santri_id())));
create policy "Admin read hafalan_doa" on perkembangan_hafalan_doa for select using ((user_role() = 'ADMIN'::text));
create policy "Pengajar hafalan_doa" on perkembangan_hafalan_doa  using (((user_role() = 'PENGAJAR'::text) AND (santri_id = ANY (pengajar_santri_ids()))));
create policy "Santri read hafalan_doa" on perkembangan_hafalan_doa for select using (((user_role() = 'SANTRI'::text) AND (santri_id = anak_santri_id())));
create policy "Admin read salat_komponen" on perkembangan_salat_komponen for select using ((user_role() = 'ADMIN'::text));
create policy "Pengajar salat_komponen" on perkembangan_salat_komponen  using (((user_role() = 'PENGAJAR'::text) AND (santri_id = ANY (pengajar_santri_ids()))));
create policy "Santri read salat_komponen" on perkembangan_salat_komponen for select using (((user_role() = 'SANTRI'::text) AND (santri_id = anak_santri_id())));
create policy "Admin read praktik_salat" on praktik_salat for select using ((user_role() = 'ADMIN'::text));
create policy "Pengajar praktik_salat" on praktik_salat  using (((user_role() = 'PENGAJAR'::text) AND (santri_id = ANY (pengajar_santri_ids()))));
create policy "Santri read praktik_salat" on praktik_salat for select using (((user_role() = 'SANTRI'::text) AND (santri_id = anak_santri_id())));
create policy "Admin read presensi" on presensi for select using ((user_role() = 'ADMIN'::text));
create policy "Pengajar presensi" on presensi  using (((user_role() = 'PENGAJAR'::text) AND (santri_id = ANY (pengajar_santri_ids()))));
create policy "Santri read presensi" on presensi for select using (((user_role() = 'SANTRI'::text) AND (santri_id = anak_santri_id())));
create policy "Admin profiles" on profiles  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read profiles" on profiles for select using ((user_role() = 'PENGAJAR'::text));
create policy "Santri read profiles" on profiles for select using (((user_role() = 'SANTRI'::text) AND (id = auth.uid())));
create policy "Admin santri" on santri  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read santri" on santri for select using (((user_role() = 'PENGAJAR'::text) AND (kelompok_id = ANY (pengajar_kelompok_ids()))));
create policy "Santri read santri" on santri for select using (((user_role() = 'SANTRI'::text) AND (id = anak_santri_id())));
create policy "Admin sesi" on sesi  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read sesi" on sesi for select using ((user_role() = 'PENGAJAR'::text));
create policy "Santri read sesi" on sesi for select using ((user_role() = 'SANTRI'::text));
create policy "Admin surat" on surat  using ((user_role() = 'ADMIN'::text));
create policy "Pengajar read surat" on surat for select using ((user_role() = ANY (ARRAY['ADMIN'::text, 'PENGAJAR'::text, 'SANTRI'::text])));
