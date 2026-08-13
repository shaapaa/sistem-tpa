-- ============================================
-- DATABASE SCHEMA: Sistem Monitoring TPA Baitul Yatama
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- ============================================

-- ============================================
-- USERS (extends auth.users)
-- ============================================

create table users (
  id uuid primary key,
  username text unique not null,
  role text not null check (role in ('ADMIN', 'PENGAJAR', 'ORANG_TUA')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User profile is created manually in app code (src/lib/auth-provider.ts or signup flow)
-- No trigger on auth.users (Supabase restricts this from SQL editor)

-- ============================================
-- PENGAJAR (Teachers)
-- ============================================

create table pengajars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete restrict,
  nama text not null,
  jenis_kelamin text,
  no_hp text,
  alamat text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- GROUPS (Class Groups)
-- ============================================

create table groups (
  id uuid primary key default gen_random_uuid(),
  nama_group text unique not null,
  sesi text not null check (sesi in ('PAGI', 'SORE')),
  tingkat text not null check (tingkat in ('IQRA', 'QURAN')),
  deskripsi text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table group_pengajars (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  pengajar_id uuid references pengajars(id) on delete cascade,
  created_at timestamptz default now(),
  unique(group_id, pengajar_id)
);

-- ============================================
-- SANTRI (Students)
-- ============================================

create table santris (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete restrict,
  group_id uuid references groups(id) on delete cascade,
  nama text not null,
  jenis_kelamin text,
  tanggal_lahir date,
  alamat text,
  nama_ayah text,
  nama_ibu text,
  no_hp_wali text,
  pekerjaan_ayah text,
  pekerjaan_ibu text,
  iuran numeric(10,2) default 0,
  keterangan text check (keterangan in ('IQRA', 'QURAN')),
  pendidikan_saat_ini text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ORANG_TUA (Parents — links parent user to child santri)
-- ============================================

create table orang_tuas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete restrict,
  santri_id uuid unique references santris(id) on delete cascade,
  created_at timestamptz default now()
);

-- ============================================
-- JADWAL (Schedules)
-- ============================================

create table jadwals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  pengajar_id uuid references pengajars(id) on delete cascade,
  hari text not null check (hari in ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU','MINGGU')),
  jam_mulai time not null,
  jam_selesai time not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PERTEMUAN (Meetings)
-- ============================================

create table pertemuans (
  id uuid primary key default gen_random_uuid(),
  jadwal_id uuid references jadwals(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  tanggal date not null,
  tema text,
  catatan text,
  status text default 'DRAFT' check (status in ('DRAFT', 'SELESAI', 'DIBATALKAN')),
  created_by uuid references pengajars(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ATTENDANCE & PROGRESS
-- ============================================

create table absensis (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references pertemuans(id) on delete cascade,
  student_id uuid references santris(id) on delete cascade,
  teacher_id uuid references pengajars(id) on delete cascade,
  status text not null check (status in ('HADIR', 'IZIN', 'SAKIT', 'ALPHA')),
  keterangan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(meeting_id, student_id)
);

create table progres_bacaans (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references pertemuans(id) on delete cascade,
  student_id uuid references santris(id) on delete cascade,
  teacher_id uuid references pengajars(id) on delete cascade,
  tipe_bacaan text not null check (tipe_bacaan in ('IQRA', 'QURAN')),
  iqra_ke int,
  halaman_iqra int,
  surah text,
  ayat_mulai int,
  ayat_selesai int,
  halaman_quran int,
  juz int,
  catatan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table hafalans (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references pertemuans(id) on delete cascade,
  student_id uuid references santris(id) on delete cascade,
  teacher_id uuid references pengajars(id) on delete cascade,
  nama_surah text not null,
  status text not null check (status in ('LANCAR', 'KURANG_LANCAR', 'TIDAK_LANCAR')),
  nilai int not null check (nilai between 0 and 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table doa_harians (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references pertemuans(id) on delete cascade,
  student_id uuid references santris(id) on delete cascade,
  teacher_id uuid references pengajars(id) on delete cascade,
  nama_doa text not null,
  status text not null check (status in ('LANCAR', 'KURANG_LANCAR', 'TIDAK_LANCAR')),
  nilai int not null check (nilai between 0 and 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table praktik_sholats (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references pertemuans(id) on delete cascade,
  student_id uuid references santris(id) on delete cascade,
  teacher_id uuid references pengajars(id) on delete cascade,
  gerakan int check (gerakan between 0 and 100),
  bacaan int check (bacaan between 0 and 100),
  tertib int check (tertib between 0 and 100),
  kekhusyukan int check (kekhusyukan between 0 and 100),
  catatan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table evaluasis (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references pertemuans(id) on delete cascade,
  student_id uuid references santris(id) on delete cascade,
  teacher_id uuid references pengajars(id) on delete cascade,
  catatan text not null,
  rekomendasi text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PERKEMBANGAN SANTRIS (Unified Development Tracking)
-- ============================================

create table perkembangan_santris (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references santris(id) on delete cascade,
  teacher_id uuid references pengajars(id) on delete cascade,
  meeting_id uuid references pertemuans(id) on delete cascade,
  tanggal date not null default current_date,
  tipe_perkembangan text not null check (tipe_perkembangan in ('BACAAN', 'HAFALAN', 'PRAKTIK_SHOLAT')),
  
  -- For BACAAN type
  jenis_bacaan text check (jenis_bacaan in ('IQRA', 'QURAN')),
  iqra_ke int,
  halaman_iqra int,
  juz int,
  surah text,
  
  -- For HAFALAN type
  nama_surah text,
  nama_doa text,
  
  -- For PRAKTIK_SHOLAT type
  jenis_sholat text,
  
  -- Common fields
  penilaian text check (penilaian in ('BAIK', 'CUKUP_BAIK', 'KURANG')),
  catatan text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_santris_group on santris(group_id);
create index idx_pengajars_nama on pengajars(nama);
create index idx_santris_nama on santris(nama);
create index idx_jadwals_group on jadwals(group_id);
create index idx_jadwals_hari on jadwals(hari);
create index idx_pertemuans_jadwal on pertemuans(jadwal_id);
create index idx_pertemuans_group on pertemuans(group_id);
create index idx_pertemuans_tanggal on pertemuans(tanggal);
create index idx_absensis_student on absensis(student_id);
create index idx_absensis_teacher on absensis(teacher_id);
create index idx_progres_bacaans_student on progres_bacaans(student_id);
create index idx_hafalans_student on hafalans(student_id);
create index idx_hafalans_nama_surah on hafalans(nama_surah);
create index idx_perkembangan_student on perkembangan_santris(student_id);
create index idx_perkembangan_teacher on perkembangan_santris(teacher_id);
create index idx_perkembangan_tanggal on perkembangan_santris(tanggal);
create index idx_perkembangan_tipe on perkembangan_santris(tipe_perkembangan);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Helper functions
create or replace function public.user_role()
returns text as $$
  select role from users where id = auth.uid() limit 1;
$$ language sql security definer stable;

create or replace function public.pengajar_id()
returns uuid as $$
  select id from pengajars where user_id = auth.uid() limit 1;
$$ language sql security definer stable;

create or replace function public.pengajar_in_group(g_id uuid)
returns boolean as $$
  select exists (
    select 1 from group_pengajars
    where pengajar_id = public.pengajar_id() and group_id = g_id
  );
$$ language sql security definer stable;

create or replace function public.anak_id()
returns uuid as $$
  select santri_id from orang_tuas where user_id = auth.uid() limit 1;
$$ language sql security definer stable;

-- Enable RLS
alter table users enable row level security;
alter table pengajars enable row level security;
alter table santris enable row level security;
alter table groups enable row level security;
alter table group_pengajars enable row level security;
alter table jadwals enable row level security;
alter table pertemuans enable row level security;
alter table absensis enable row level security;
alter table progres_bacaans enable row level security;
alter table hafalans enable row level security;
alter table doa_harians enable row level security;
alter table praktik_sholats enable row level security;
alter table evaluasis enable row level security;
alter table orang_tuas enable row level security;
alter table perkembangan_santris enable row level security;

-- ADMIN: full access
create policy "Admin users" on users for all using (public.user_role() = 'ADMIN');
create policy "Admin pengajars" on pengajars for all using (public.user_role() = 'ADMIN');
create policy "Admin santris" on santris for all using (public.user_role() = 'ADMIN');
create policy "Admin groups" on groups for all using (public.user_role() = 'ADMIN');
create policy "Admin group_pengajars" on group_pengajars for all using (public.user_role() = 'ADMIN');
create policy "Admin jadwals" on jadwals for all using (public.user_role() = 'ADMIN');
create policy "Admin pertemuans" on pertemuans for all using (public.user_role() = 'ADMIN');
create policy "Admin absensis" on absensis for all using (public.user_role() = 'ADMIN');
create policy "Admin progres" on progres_bacaans for all using (public.user_role() = 'ADMIN');
create policy "Admin hafalans" on hafalans for all using (public.user_role() = 'ADMIN');
create policy "Admin doa" on doa_harians for all using (public.user_role() = 'ADMIN');
create policy "Admin sholat" on praktik_sholats for all using (public.user_role() = 'ADMIN');
create policy "Admin evaluasi" on evaluasis for all using (public.user_role() = 'ADMIN');
create policy "Admin orang_tuas" on orang_tuas for all using (public.user_role() = 'ADMIN');

-- PERKEMBANGAN SANTRIS policies
create policy "Admin perkembangan" on perkembangan_santris for all using (public.user_role() = 'ADMIN');
create policy "Pengajar write perkembangan" on perkembangan_santris for all using (public.user_role() = 'PENGAJAR' and public.pengajar_in_group((select group_id from santris where id = student_id)));
create policy "Orang Tua read perkembangan" on perkembangan_santris for select using (public.user_role() = 'ORANG_TUA' and student_id = public.anak_id());

-- PENGAJAR: read/write their assigned groups
create policy "Pengajar read users" on users for select using (public.user_role() = 'PENGAJAR');
create policy "Pengajar read pengajars" on pengajars for select using (public.user_role() = 'PENGAJAR');
create policy "Pengajar read santris" on santris for select using (public.user_role() = 'PENGAJAR' and public.pengajar_in_group(group_id));
create policy "Pengajar read groups" on groups for select using (public.user_role() = 'PENGAJAR');
create policy "Pengajar read group_pengajars" on group_pengajars for select using (public.user_role() = 'PENGAJAR');
create policy "Pengajar read jadwals" on jadwals for select using (public.user_role() = 'PENGAJAR' and pengajar_id = public.pengajar_id());
create policy "Pengajar read pertemuans" on pertemuans for select using (public.user_role() = 'PENGAJAR');
create policy "Pengajar write pertemuans" on pertemuans for all using (public.user_role() = 'PENGAJAR' and public.pengajar_in_group(group_id)) with check (public.user_role() = 'PENGAJAR' and public.pengajar_in_group(group_id));
create policy "Pengajar write absensis" on absensis for all using (public.user_role() = 'PENGAJAR' and public.pengajar_in_group((select group_id from santris where id = student_id)));
create policy "Pengajar write progres" on progres_bacaans for all using (public.user_role() = 'PENGAJAR' and public.pengajar_in_group((select group_id from santris where id = student_id)));
create policy "Pengajar write hafalans" on hafalans for all using (public.user_role() = 'PENGAJAR' and public.pengajar_in_group((select group_id from santris where id = student_id)));
create policy "Pengajar write doa" on doa_harians for all using (public.user_role() = 'PENGAJAR' and public.pengajar_in_group((select group_id from santris where id = student_id)));
create policy "Pengajar write sholat" on praktik_sholats for all using (public.user_role() = 'PENGAJAR' and public.pengajar_in_group((select group_id from santris where id = student_id)));
create policy "Pengajar write evaluasi" on evaluasis for all using (public.user_role() = 'PENGAJAR' and public.pengajar_in_group((select group_id from santris where id = student_id)));

-- ORANG_TUA: read-only their linked child
create policy "Orang Tua read users" on users for select using (public.user_role() = 'ORANG_TUA');
create policy "Orang Tua read santris" on santris for select using (public.user_role() = 'ORANG_TUA' and id = public.anak_id());
create policy "Orang Tua read groups" on groups for select using (public.user_role() = 'ORANG_TUA' and id = (select group_id from santris where id = public.anak_id()));
create policy "Orang Tua read absensis" on absensis for select using (public.user_role() = 'ORANG_TUA' and student_id = public.anak_id());
create policy "Orang Tua read progres" on progres_bacaans for select using (public.user_role() = 'ORANG_TUA' and student_id = public.anak_id());
create policy "Orang Tua read hafalans" on hafalans for select using (public.user_role() = 'ORANG_TUA' and student_id = public.anak_id());
create policy "Orang Tua read doa" on doa_harians for select using (public.user_role() = 'ORANG_TUA' and student_id = public.anak_id());
create policy "Orang Tua read sholat" on praktik_sholats for select using (public.user_role() = 'ORANG_TUA' and student_id = public.anak_id());
create policy "Orang Tua read evaluasi" on evaluasis for select using (public.user_role() = 'ORANG_TUA' and student_id = public.anak_id());
create policy "Orang Tua read orang_tuas" on orang_tuas for select using (public.user_role() = 'ORANG_TUA' and user_id = auth.uid());
