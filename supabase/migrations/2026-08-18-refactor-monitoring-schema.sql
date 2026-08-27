-- ============================================================================
-- MIGRATION: Refactor skema monitoring santri TPA
-- Database: Supabase PostgreSQL
-- Sifat    : IDEMPOTENT (aman dijalankan ulang; pakai IF NOT EXISTS / DO$$)
--
-- PENTING SEBELUM MENJALANKAN:
-- 1) Tabel lama (users, pengajars, santris, absensis, jadwals, pertemuans,
--    perkembangan_santris, progres_bacaans, hafalans, doa_harians,
--    praktik_sholats, evaluasis, orang_tuas) TIDAK di-drop.
--    Tabel baru dibuat dengan nama berbeda, lalu data lama di-backfill.
-- 2) Perubahan yang berpotensi "kehilangan makna" (documented loss):
--    - praktik_sholats (skor 4 kolom, tanpa jenis salat) -> praktik_salat
--      dengan jenis_salat_id NULL + skor asli di catatan.
--    - hafalans lama (tanpa rentang ayat) -> cicilan jenis 'evaluasi',
--      rentang 1..jumlah_ayat surat.
--    - santri lama tanpa data kelompok -> ditempatkan di kelompok A sesuai sesi.
-- 3) Role lama 'ORANG_TUA' diubah menjadi 'SANTRI'; akun OT menjadi profile
--    santri (orang_tuas di-deprecate).
-- ============================================================================


-- ============================================================================
-- 1. PROFILES  (menggantikan users)
-- ============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null default '',
  role text not null check (role in ('ADMIN','PENGAJAR','SANTRI')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill profiles dari users (ORANG_TUA -> SANTRI)
insert into profiles (id, nama, role, is_active, created_at, updated_at)
select
  u.id,
  coalesce(u.username, ''),
  case u.role when 'ORANG_TUA' then 'SANTRI' else u.role end,
  coalesce(u.is_active, true),
  u.created_at,
  u.updated_at
from users u
on conflict (id) do nothing;


-- ============================================================================
-- 2. PENGAJAR  (menggantikan pengajars)
-- ============================================================================
create table if not exists pengajar (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete set null,
  nama text not null,
  jenis_kelamin text check (jenis_kelamin in ('LAKI_LAKI','PEREMPUAN')),
  no_hp text,
  alamat text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into pengajar (id, profile_id, nama, jenis_kelamin, no_hp, alamat, created_at, updated_at)
select p.id, p.user_id, p.nama, p.jenis_kelamin, p.no_hp, p.alamat, p.created_at, p.updated_at
from pengajars p
on conflict (id) do nothing;

-- Sinkronkan nama profile dari data pengajar
update profiles pr
set nama = pj.nama, updated_at = now()
from pengajar pj where pj.profile_id = pr.id and pr.nama = '';


-- ============================================================================
-- 3. SESI
-- ============================================================================
create table if not exists sesi (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique check (nama in ('PAGI','SORE')),
  created_at timestamptz default now()
);

insert into sesi (nama) values ('PAGI'), ('SORE') on conflict (nama) do nothing;


-- ============================================================================
-- 4. KELOMPOK  (4 kelompok: Pagi A/B, Sore A/B)
-- ============================================================================
create table if not exists kelompok (
  id uuid primary key default gen_random_uuid(),
  sesi_id uuid not null references sesi(id) on delete restrict,
  nama text not null check (nama in ('A','B')),
  pengajar_id uuid references pengajar(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (sesi_id, nama)
);

-- Seed 4 kelompok; pengajar ditugaskan sesuai jadwal lama:
-- Fatimah -> Pagi A, Hamid -> Sore A, Maryam -> Sore B, Pagi B kosong.
do $$
declare
  v_pagi uuid; v_sore uuid;
  v_fatimah uuid; v_hamid uuid; v_maryam uuid;
begin
  select id into v_pagi from sesi where nama='PAGI';
  select id into v_sore from sesi where nama='SORE';
  select id into v_fatimah from pengajar where nama ilike 'Fatimah%';
  select id into v_hamid   from pengajar where nama ilike 'Hamid%';
  select id into v_maryam  from pengajar where nama ilike 'Maryam%';

  insert into kelompok (sesi_id, nama, pengajar_id) values
    (v_pagi, 'A', v_fatimah),
    (v_pagi, 'B', null),
    (v_sore, 'A', v_hamid),
    (v_sore, 'B', v_maryam)
  on conflict (sesi_id, nama) do update set pengajar_id = excluded.pengajar_id;
end $$;


-- ============================================================================
-- 5. SANTRI  (menggantikan santris; sesi text -> kelompok_id)
-- ============================================================================
create table if not exists santri (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete set null,
  kelompok_id uuid references kelompok(id) on delete set null,
  nama text not null,
  jenis_kelamin text check (jenis_kelamin in ('LAKI_LAKI','PEREMPUAN')),
  tanggal_lahir date,
  alamat text,
  nama_ayah text,
  nama_ibu text,
  no_hp_wali text,
  pekerjaan_ayah text,
  pekerjaan_ibu text,
  iuran numeric(10,2) default 0,
  keterangan text check (keterangan in ('IQRA','QURAN')),
  pendidikan_saat_ini text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into santri
  (id, profile_id, kelompok_id, nama, jenis_kelamin, tanggal_lahir, alamat,
   nama_ayah, nama_ibu, no_hp_wali, pekerjaan_ayah, pekerjaan_ibu, iuran,
   keterangan, pendidikan_saat_ini, created_at, updated_at)
select
  s.id,
  ot.user_id,                       -- akun ORANG_TUA lama -> profile SANTRI
  k.id,                             -- kelompok A sesuai sesi
  s.nama, s.jenis_kelamin, s.tanggal_lahir, s.alamat,
  s.nama_ayah, s.nama_ibu, s.no_hp_wali, s.pekerjaan_ayah, s.pekerjaan_ibu,
  s.iuran, s.keterangan, s.pendidikan_saat_ini,
  s.created_at, s.updated_at
from santris s
left join orang_tuas ot on ot.santri_id = s.id
left join kelompok k on k.nama = 'A'
  and k.sesi_id = (select id from sesi where nama = s.sesi)
on conflict (id) do nothing;

-- Santri tanpa akun OT (profile_id tetap null)
insert into santri
  (id, profile_id, kelompok_id, nama, jenis_kelamin, tanggal_lahir, alamat,
   nama_ayah, nama_ibu, no_hp_wali, pekerjaan_ayah, pekerjaan_ibu, iuran,
   keterangan, pendidikan_saat_ini, created_at, updated_at)
select
  s.id, null, k.id,
  s.nama, s.jenis_kelamin, s.tanggal_lahir, s.alamat,
  s.nama_ayah, s.nama_ibu, s.no_hp_wali, s.pekerjaan_ayah, s.pekerjaan_ibu,
  s.iuran, s.keterangan, s.pendidikan_saat_ini, s.created_at, s.updated_at
from santris s
left join kelompok k on k.nama = 'A' and k.sesi_id = (select id from sesi where nama = s.sesi)
where not exists (select 1 from santri n where n.id = s.id)
on conflict (id) do nothing;

-- Sinkronkan nama profile dari data santri
update profiles pr
set nama = s.nama, updated_at = now()
from santri s where s.profile_id = pr.id and pr.nama = '';


-- ============================================================================
-- 6. MASTER SURAT  (Juz 30 + Al-Fatihah)
-- ============================================================================
create table if not exists surat (
  id uuid primary key default gen_random_uuid(),
  nomor int not null unique,
  nama text not null unique,
  jumlah_ayat int not null check (jumlah_ayat > 0),
  juz int not null,
  aktif boolean default true,
  created_at timestamptz default now()
);

insert into surat (nomor, nama, jumlah_ayat, juz, aktif) values
  (1,   'Al-Fatihah',      7,  1,  true),
  (78,  'An-Naba',         40, 30, true),
  (79,  'An-Nazi''at',     46, 30, true),
  (80,  'Abasa',           42, 30, true),
  (81,  'At-Takwir',       29, 30, true),
  (82,  'Al-Infitar',      19, 30, true),
  (83,  'Al-Mutaffifin',   36, 30, true),
  (84,  'Al-Inshiqaq',     25, 30, true),
  (85,  'Al-Buruj',        22, 30, true),
  (86,  'At-Tariq',        17, 30, true),
  (87,  'Al-A''la',        19, 30, true),
  (88,  'Al-Ghashiyah',    26, 30, true),
  (89,  'Al-Fajr',         30, 30, true),
  (90,  'Al-Balad',        20, 30, true),
  (91,  'Ash-Shams',       15, 30, true),
  (92,  'Al-Layl',         21, 30, true),
  (93,  'Ad-Duha',         11, 30, true),
  (94,  'Ash-Sharh',        8, 30, true),
  (95,  'At-Tin',           8, 30, true),
  (96,  'Al-Alaq',         19, 30, true),
  (97,  'Al-Qadr',          5, 30, true),
  (98,  'Al-Bayyinah',      8, 30, true),
  (99,  'Az-Zalzalah',      8, 30, true),
  (100, 'Al-Adiyat',       11, 30, true),
  (101, 'Al-Qari''ah',     11, 30, true),
  (102, 'At-Takathur',      8, 30, true),
  (103, 'Al-Asr',           3, 30, true),
  (104, 'Al-Humazah',       9, 30, true),
  (105, 'Al-Fil',           5, 30, true),
  (106, 'Quraysh',          4, 30, true),
  (107, 'Al-Ma''un',        7, 30, true),
  (108, 'Al-Kawthar',       3, 30, true),
  (109, 'Al-Kafirun',       6, 30, true),
  (110, 'An-Nasr',          3, 30, true),
  (111, 'Al-Masad',         5, 30, true),
  (112, 'Al-Ikhlas',        4, 30, true),
  (113, 'Al-Falaq',         5, 30, true),
  (114, 'An-Nas',           6, 30, true)
on conflict (nomor) do nothing;


-- ============================================================================
-- 7. MASTER DOA
-- ============================================================================
create table if not exists doa (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  aktif boolean default true,
  created_at timestamptz default now()
);

insert into doa (nama) values
  ('Doa Sebelum Makan'), ('Doa Sesudah Makan'), ('Doa Sebelum Tidur'),
  ('Doa Bangun Tidur'), ('Doa Masuk WC'), ('Doa Keluar WC'),
  ('Doa Masuk Rumah'), ('Doa Keluar Rumah'), ('Doa Masuk Masjid'),
  ('Doa Keluar Masjid'), ('Doa Sebelum Belajar'), ('Doa Untuk Orang Tua'),
  ('Doa Naik Kendaraan'), ('Doa Sebelum Wudhu'), ('Doa Sesudah Wudhu'),
  ('Doa Bercermin'), ('Doa Memakai Pakaian'), ('Doa Melepas Pakaian'),
  ('Doa Menerima Zakat/Sedekah'), ('Doa untuk Keselamatan Dunia Akhirat'),
  ('Doa Sapu Jagat')
on conflict (nama) do nothing;

-- Tambahkan doa lama yang belum ada di master (agar tidak hilang)
insert into doa (nama)
select distinct nama_doa from doa_harians where nama_doa is not null
on conflict (nama) do nothing;


-- ============================================================================
-- 8. MASTER KOMPONEN SALAT  (Level 1)
-- ============================================================================
create table if not exists komponen_salat (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  aktif boolean default true,
  created_at timestamptz default now()
);

insert into komponen_salat (nama) values
  ('Takbiratul ihram'), ('Berdiri'), ('Rukuk'), ('I''tidal'),
  ('Sujud'), ('Duduk antara dua sujud'), ('Tasyahud'), ('Salam')
on conflict (nama) do nothing;


-- ============================================================================
-- 9. MASTER JENIS SALAT  (Level 2)
-- ============================================================================
create table if not exists jenis_salat (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  aktif boolean default true,
  created_at timestamptz default now()
);

insert into jenis_salat (nama) values
  ('Subuh'), ('Zuhur'), ('Asar'), ('Magrib'), ('Isya')
on conflict (nama) do nothing;


-- ============================================================================
-- 10. JADWAL  (kelompok_id + hari, unique per kelompok per hari)
-- ============================================================================
create table if not exists jadwal (
  id uuid primary key default gen_random_uuid(),
  kelompok_id uuid not null references kelompok(id) on delete cascade,
  hari text not null check (hari in ('SENIN','SELASA','RABU','KAMIS','JUMAT')),
  jam_mulai time,
  jam_selesai time,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (kelompok_id, hari)
);

-- Backfill: jadwal lama (punya pengajar) -> kelompok yang diasuh pengajar tsb.
insert into jadwal (kelompok_id, hari, jam_mulai, jam_selesai, is_active, created_at, updated_at)
select k.id, j.hari, j.jam_mulai, j.jam_selesai, j.is_active, j.created_at, j.updated_at
from jadwals j
join kelompok k on k.pengajar_id = j.pengajar_id
where j.pengajar_id is not null
on conflict (kelompok_id, hari) do nothing;


-- ============================================================================
-- 11. PRESENSI  (menggantikan absensis + pertemuans)
-- ============================================================================
create table if not exists presensi (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references santri(id) on delete cascade,
  kelompok_id uuid references kelompok(id) on delete set null,
  pengajar_id uuid references pengajar(id) on delete set null,
  tanggal date not null,
  status text not null check (status in ('HADIR','IZIN','SAKIT','ALPHA')),
  keterangan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (santri_id, tanggal)
);

-- Backfill: tanggal dari pertemuans (via meeting_id), kelompok dari santri.
insert into presensi (id, santri_id, kelompok_id, pengajar_id, tanggal, status, keterangan, created_at, updated_at)
select
  a.id, a.student_id, s.kelompok_id, a.teacher_id,
  p.tanggal, a.status, a.keterangan, a.created_at, a.updated_at
from absensis a
left join pertemuans p on p.id = a.meeting_id
left join santri s on s.id = a.student_id
where p.tanggal is not null
on conflict (santri_id, tanggal) do nothing;


-- ============================================================================
-- 12. PERKEMBANGAN BACAAN
-- ============================================================================
create table if not exists perkembangan_bacaan (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references santri(id) on delete cascade,
  pengajar_id uuid references pengajar(id) on delete set null,
  tanggal date not null default current_date,
  jenis_bacaan text not null check (jenis_bacaan in ('IQRA','QURAN')),
  jilid int check (jilid between 1 and 6),
  halaman int,
  juz int check (juz between 1 and 30),
  surat_id uuid references surat(id) on delete set null,
  ayat_mulai int,
  ayat_selesai int,
  status text check (status in ('LANCAR','KURANG_LANCAR','TIDAK_LANCAR')),
  catatan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill dari progres_bacaans (status tidak tersedia -> NULL, surat di-match)
insert into perkembangan_bacaan
  (santri_id, pengajar_id, tanggal, jenis_bacaan, jilid, halaman, juz, surat_id,
   ayat_mulai, ayat_selesai, catatan, created_at, updated_at)
select
  pb.student_id, pb.teacher_id, coalesce(p.tanggal, current_date),
  pb.tipe_bacaan,
  pb.iqra_ke, pb.halaman_iqra, pb.juz,
  s.id,
  pb.ayat_mulai, pb.ayat_selesai,
  case when pb.surah is not null and s.id is null then 'surah lama: ' || pb.surah else pb.catatan end,
  pb.created_at, pb.updated_at
from progres_bacaans pb
left join pertemuans p on p.id = pb.meeting_id
left join surat s on lower(s.nama) = lower(pb.surah)
                  or (pb.surah = 'Al-Lahab' and s.nama = 'Al-Masad');

-- Backfill dari perkembangan_santris (tipe BACAAN); penilaian -> status
insert into perkembangan_bacaan
  (santri_id, pengajar_id, tanggal, jenis_bacaan, jilid, halaman, juz, surat_id,
   ayat_mulai, ayat_selesai, status, catatan, created_at, updated_at)
select
  ps.student_id, ps.teacher_id, ps.tanggal, ps.jenis_bacaan,
  ps.iqra_ke, ps.halaman_iqra, ps.juz,
  s.id,
  null, null,
  case ps.penilaian when 'BAIK' then 'LANCAR' when 'CUKUP_BAIK' then 'KURANG_LANCAR' when 'KURANG' then 'TIDAK_LANCAR' end,
  case when ps.surah is not null and s.id is null then 'surah lama: ' || ps.surah else ps.catatan end,
  ps.created_at, ps.updated_at
from perkembangan_santris ps
left join surat s on lower(s.nama) = lower(ps.surah)
                  or (ps.surah = 'Al-Lahab' and s.nama = 'Al-Masad')
where ps.tipe_perkembangan = 'BACAAN';


-- ============================================================================
-- 13. HAFALAN SURAT  (hafalan_santri + hafalan_surat_cicilan)
-- ============================================================================
create table if not exists hafalan_santri (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references santri(id) on delete cascade,
  surat_id uuid not null references surat(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (santri_id, surat_id)
);

create table if not exists hafalan_surat_cicilan (
  id uuid primary key default gen_random_uuid(),
  hafalan_santri_id uuid not null references hafalan_santri(id) on delete cascade,
  pengajar_id uuid references pengajar(id) on delete set null,
  tanggal date not null default current_date,
  ayat_mulai int not null,
  ayat_selesai int not null,
  status text check (status in ('LANCAR','KURANG_LANCAR','TIDAK_LANCAR')),
  jenis text not null check (jenis in ('setoran_baru','evaluasi')) default 'setoran_baru',
  catatan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (ayat_selesai >= ayat_mulai)
);

-- Backfill dari perkembangan_santris (tipe HAFALAN dengan nama_surah)
do $$
declare
  r record;
  v_haf uuid;
  v_jumlah int;
begin
  for r in
    select ps.id, ps.student_id, ps.teacher_id, ps.tanggal, ps.nama_surah,
           ps.ayat_mulai, ps.ayat_selesai, ps.penilaian, ps.catatan
    from perkembangan_santris ps
    where ps.tipe_perkembangan = 'HAFALAN' and ps.nama_surah is not null
  loop
    select s.id, s.jumlah_ayat into v_haf, v_jumlah
    from surat s
    where lower(s.nama) = lower(r.nama_surah)
       or (r.nama_surah = 'Al-Lahab' and s.nama = 'Al-Masad');
    if v_haf is null then
      -- surat tidak ada di master: lewati, tercatat di log (tidak hilang dari tabel lama)
      continue;
    end if;

    insert into hafalan_santri (santri_id, surat_id)
    values (r.student_id, v_haf)
    on conflict (santri_id, surat_id) do update set updated_at = now()
    returning id into v_haf;

    insert into hafalan_surat_cicilan
      (hafalan_santri_id, pengajar_id, tanggal, ayat_mulai, ayat_selesai, status, jenis, catatan, created_at, updated_at)
    values (
      v_haf, r.teacher_id, r.tanggal,
      coalesce(r.ayat_mulai, 1),
      coalesce(r.ayat_selesai, v_jumlah),
      case r.penilaian when 'BAIK' then 'LANCAR' when 'CUKUP_BAIK' then 'KURANG_LANCAR' when 'KURANG' then 'TIDAK_LANCAR' end,
      case when r.ayat_mulai is null then 'evaluasi' else 'setoran_baru' end,
      r.catatan, now(), now()
    );
  end loop;
end $$;

-- Backfill dari hafalans (tanpa rentang ayat -> evaluasi 1..jumlah_ayat)
do $$
declare
  r record;
  v_haf uuid;
  v_jumlah int;
begin
  for r in
    select h.id, h.student_id, h.teacher_id, h.nama_surah, h.status,
           coalesce(p.tanggal, current_date) as tanggal, h.nilai
    from hafalans h
    left join pertemuans p on p.id = h.meeting_id
  loop
    select s.id, s.jumlah_ayat into v_haf, v_jumlah
    from surat s
    where lower(s.nama) = lower(r.nama_surah)
       or (r.nama_surah = 'Al-Lahab' and s.nama = 'Al-Masad');
    if v_haf is null then continue; end if;

    insert into hafalan_santri (santri_id, surat_id)
    values (r.student_id, v_haf)
    on conflict (santri_id, surat_id) do update set updated_at = now()
    returning id into v_haf;

    insert into hafalan_surat_cicilan
      (hafalan_santri_id, pengajar_id, tanggal, ayat_mulai, ayat_selesai, status, jenis, catatan, created_at, updated_at)
    values (
      v_haf, r.teacher_id, r.tanggal, 1, v_jumlah, r.status, 'evaluasi',
      'nilai lama: ' || r.nilai, now(), now()
    );
  end loop;
end $$;


-- ============================================================================
-- 14. PERKEMBANGAN HAFALAN DOA
-- ============================================================================
create table if not exists perkembangan_hafalan_doa (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references santri(id) on delete cascade,
  doa_id uuid not null references doa(id) on delete cascade,
  pengajar_id uuid references pengajar(id) on delete set null,
  tanggal date not null default current_date,
  status text check (status in ('LANCAR','KURANG_LANCAR','TIDAK_LANCAR')),
  catatan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into perkembangan_hafalan_doa
  (santri_id, doa_id, pengajar_id, tanggal, status, catatan, created_at, updated_at)
select
  dh.student_id, d.id, dh.teacher_id, coalesce(p.tanggal, current_date),
  dh.status,
  'nilai lama: ' || dh.nilai,
  dh.created_at, dh.updated_at
from doa_harians dh
join doa d on lower(d.nama) = lower(dh.nama_doa)
left join pertemuans p on p.id = dh.meeting_id;

-- Backfill hafalan doa dari perkembangan_santris (nama_doa)
insert into perkembangan_hafalan_doa
  (santri_id, doa_id, pengajar_id, tanggal, status, catatan, created_at, updated_at)
select
  ps.student_id, d.id, ps.teacher_id, ps.tanggal,
  case ps.penilaian when 'BAIK' then 'LANCAR' when 'CUKUP_BAIK' then 'KURANG_LANCAR' when 'KURANG' then 'TIDAK_LANCAR' end,
  ps.catatan, ps.created_at, ps.updated_at
from perkembangan_santris ps
join doa d on lower(d.nama) = lower(ps.nama_doa)
where ps.tipe_perkembangan = 'HAFALAN' and ps.nama_doa is not null;


-- ============================================================================
-- 15. PERKEMBANGAN SALAT KOMPONEN (Level 1)
-- ============================================================================
create table if not exists perkembangan_salat_komponen (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references santri(id) on delete cascade,
  komponen_salat_id uuid not null references komponen_salat(id) on delete cascade,
  pengajar_id uuid references pengajar(id) on delete set null,
  tanggal date not null default current_date,
  status text check (status in ('LANCAR','BUTUH_BIMBINGAN')),
  catatan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Data lama praktik_sholats tidak punya jenis salat & skor komponen berbeda
-- dari master 8 komponen. Dipertahankan di tabel lama (deprecate), TIDAK
-- dipindah otomatis agar tidak memfabrikasi makna penilaian komponen.


-- ============================================================================
-- 16. PRAKTIK SALAT (Level 2)
-- ============================================================================
create table if not exists praktik_salat (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null references santri(id) on delete cascade,
  jenis_salat_id uuid references jenis_salat(id) on delete set null,
  pengajar_id uuid references pengajar(id) on delete set null,
  tanggal date not null default current_date,
  status text check (status in ('LANCAR','BUTUH_BIMBINGAN')),
  catatan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill lossy dari praktik_sholats (jenis_salat_id NULL, status dari rata-rata)
insert into praktik_salat
  (santri_id, jenis_salat_id, pengajar_id, tanggal, status, catatan, created_at, updated_at)
select
  ps.student_id, null, ps.teacher_id, coalesce(p.tanggal, current_date),
  case when ((coalesce(ps.gerakan,0)+coalesce(ps.bacaan,0)+coalesce(ps.tertib,0)+coalesce(ps.kekhusyukan,0))/4.0) >= 75 then 'LANCAR' else 'BUTUH_BIMBINGAN' end,
  'data lama praktik_sholats: gerakan='||ps.gerakan||', bacaan='||ps.bacaan||', tertib='||ps.tertib||', kekhusyukan='||ps.kekhusyukan,
  ps.created_at, ps.updated_at
from praktik_sholats ps
left join pertemuans p on p.id = ps.meeting_id;


-- ============================================================================
-- 17. INDEX
-- ============================================================================
create index if not exists idx_santri_kelompok on santri(kelompok_id);
create index if not exists idx_pengajar_profile on pengajar(profile_id);
create index if not exists idx_jadwal_kelompok on jadwal(kelompok_id);
create index if not exists idx_presensi_santri_tanggal on presensi(santri_id, tanggal);
create index if not exists idx_presensi_kelompok on presensi(kelompok_id);
create index if not exists idx_bacaan_santri on perkembangan_bacaan(santri_id);
create index if not exists idx_bacaan_tanggal on perkembangan_bacaan(tanggal);
create index if not exists idx_hafalan_santri on hafalan_santri(santri_id);
create index if not exists idx_cicilan_hafalan on hafalan_surat_cicilan(hafalan_santri_id);
create index if not exists idx_hafalan_doa_santri on perkembangan_hafalan_doa(santri_id);
create index if not exists idx_salat_komponen_santri on perkembangan_salat_komponen(santri_id);
create index if not exists idx_praktik_salat_santri on praktik_salat(santri_id);


-- ============================================================================
-- 18. HELPER FUNCTIONS (untuk RLS) + ROW LEVEL SECURITY
-- ============================================================================
create or replace function public.user_role()
returns text as $$
  select role from profiles where id = auth.uid() limit 1;
$$ language sql security definer stable;

create or replace function public.pengajar_id()
returns uuid as $$
  select id from pengajar where profile_id = auth.uid() limit 1;
$$ language sql security definer stable;

-- Kelompok yang diasuh oleh pengajar yang sedang login
create or replace function public.pengajar_kelompok_ids()
returns uuid[] as $$
  select coalesce(array_agg(id), '{}')
  from kelompok
  where pengajar_id = public.pengajar_id();
$$ language sql security definer stable;

-- Santri milik akun SANTRI yang sedang login (role santri = orang tua)
create or replace function public.anak_santri_id()
returns uuid as $$
  select id from santri where profile_id = auth.uid() limit 1;
$$ language sql security definer stable;

-- Santri yang berada di kelompok asuhan pengajar
create or replace function public.pengajar_santri_ids()
returns uuid[] as $$
  select coalesce(array_agg(id), '{}')
  from santri
  where kelompok_id = any(public.pengajar_kelompok_ids());
$$ language sql security definer stable;

alter table profiles enable row level security;
alter table pengajar enable row level security;
alter table santri enable row level security;
alter table sesi enable row level security;
alter table kelompok enable row level security;
alter table jadwal enable row level security;
alter table presensi enable row level security;
alter table surat enable row level security;
alter table doa enable row level security;
alter table komponen_salat enable row level security;
alter table jenis_salat enable row level security;
alter table perkembangan_bacaan enable row level security;
alter table hafalan_santri enable row level security;
alter table hafalan_surat_cicilan enable row level security;
alter table perkembangan_hafalan_doa enable row level security;
alter table perkembangan_salat_komponen enable row level security;
alter table praktik_salat enable row level security;

-- ADMIN: CRUD penuh pada struktur & master; READ-ONLY pada presensi & perkembangan
drop policy if exists "Admin profiles" on profiles;
create policy "Admin profiles" on profiles for all using (user_role() = 'ADMIN');
drop policy if exists "Admin pengajar" on pengajar;
create policy "Admin pengajar" on pengajar for all using (user_role() = 'ADMIN');
drop policy if exists "Admin santri" on santri;
create policy "Admin santri" on santri for all using (user_role() = 'ADMIN');
drop policy if exists "Admin sesi" on sesi;
create policy "Admin sesi" on sesi for all using (user_role() = 'ADMIN');
drop policy if exists "Admin kelompok" on kelompok;
create policy "Admin kelompok" on kelompok for all using (user_role() = 'ADMIN');
drop policy if exists "Admin jadwal" on jadwal;
create policy "Admin jadwal" on jadwal for all using (user_role() = 'ADMIN');
drop policy if exists "Admin surat" on surat;
create policy "Admin surat" on surat for all using (user_role() = 'ADMIN');
drop policy if exists "Admin doa" on doa;
create policy "Admin doa" on doa for all using (user_role() = 'ADMIN');
drop policy if exists "Admin komponen_salat" on komponen_salat;
create policy "Admin komponen_salat" on komponen_salat for all using (user_role() = 'ADMIN');
drop policy if exists "Admin jenis_salat" on jenis_salat;
create policy "Admin jenis_salat" on jenis_salat for all using (user_role() = 'ADMIN');

drop policy if exists "Admin read presensi" on presensi;
create policy "Admin read presensi" on presensi for select using (user_role() = 'ADMIN');
drop policy if exists "Admin read bacaan" on perkembangan_bacaan;
create policy "Admin read bacaan" on perkembangan_bacaan for select using (user_role() = 'ADMIN');
drop policy if exists "Admin read hafalan_santri" on hafalan_santri;
create policy "Admin read hafalan_santri" on hafalan_santri for select using (user_role() = 'ADMIN');
drop policy if exists "Admin read cicilan" on hafalan_surat_cicilan;
create policy "Admin read cicilan" on hafalan_surat_cicilan for select using (user_role() = 'ADMIN');
drop policy if exists "Admin read hafalan_doa" on perkembangan_hafalan_doa;
create policy "Admin read hafalan_doa" on perkembangan_hafalan_doa for select using (user_role() = 'ADMIN');
drop policy if exists "Admin read salat_komponen" on perkembangan_salat_komponen;
create policy "Admin read salat_komponen" on perkembangan_salat_komponen for select using (user_role() = 'ADMIN');
drop policy if exists "Admin read praktik_salat" on praktik_salat;
create policy "Admin read praktik_salat" on praktik_salat for select using (user_role() = 'ADMIN');

-- PENGAJAR
drop policy if exists "Pengajar read profiles" on profiles;
create policy "Pengajar read profiles" on profiles for select using (user_role() = 'PENGAJAR');
drop policy if exists "Pengajar read pengajar" on pengajar;
create policy "Pengajar read pengajar" on pengajar for select using (user_role() = 'PENGAJAR');
drop policy if exists "Pengajar read santri" on santri;
create policy "Pengajar read santri" on santri for select using (user_role() = 'PENGAJAR' and kelompok_id = any(public.pengajar_kelompok_ids()));
drop policy if exists "Pengajar read sesi" on sesi;
create policy "Pengajar read sesi" on sesi for select using (user_role() = 'PENGAJAR');
drop policy if exists "Pengajar read kelompok" on kelompok;
create policy "Pengajar read kelompok" on kelompok for select using (user_role() = 'PENGAJAR' and id = any(public.pengajar_kelompok_ids()));
drop policy if exists "Pengajar read jadwal" on jadwal;
create policy "Pengajar read jadwal" on jadwal for select using (user_role() = 'PENGAJAR' and kelompok_id = any(public.pengajar_kelompok_ids()));
drop policy if exists "Pengajar read surat" on surat;
create policy "Pengajar read surat" on surat for select using (user_role() in ('ADMIN','PENGAJAR','SANTRI'));
drop policy if exists "Pengajar read doa" on doa;
create policy "Pengajar read doa" on doa for select using (user_role() in ('ADMIN','PENGAJAR','SANTRI'));
drop policy if exists "Pengajar read komponen_salat" on komponen_salat;
create policy "Pengajar read komponen_salat" on komponen_salat for select using (user_role() in ('ADMIN','PENGAJAR','SANTRI'));
drop policy if exists "Pengajar read jenis_salat" on jenis_salat;
create policy "Pengajar read jenis_salat" on jenis_salat for select using (user_role() in ('ADMIN','PENGAJAR','SANTRI'));

drop policy if exists "Pengajar presensi" on presensi;
create policy "Pengajar presensi" on presensi for all
  using (user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
drop policy if exists "Pengajar bacaan" on perkembangan_bacaan;
create policy "Pengajar bacaan" on perkembangan_bacaan for all
  using (user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
drop policy if exists "Pengajar hafalan_santri" on hafalan_santri;
create policy "Pengajar hafalan_santri" on hafalan_santri for all
  using (user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
drop policy if exists "Pengajar cicilan" on hafalan_surat_cicilan;
create policy "Pengajar cicilan" on hafalan_surat_cicilan for all
  using (user_role() = 'PENGAJAR' and hafalan_santri_id in (select id from hafalan_santri where santri_id = any(public.pengajar_santri_ids())));
drop policy if exists "Pengajar hafalan_doa" on perkembangan_hafalan_doa;
create policy "Pengajar hafalan_doa" on perkembangan_hafalan_doa for all
  using (user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
drop policy if exists "Pengajar salat_komponen" on perkembangan_salat_komponen;
create policy "Pengajar salat_komponen" on perkembangan_salat_komponen for all
  using (user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));
drop policy if exists "Pengajar praktik_salat" on praktik_salat;
create policy "Pengajar praktik_salat" on praktik_salat for all
  using (user_role() = 'PENGAJAR' and santri_id = any(public.pengajar_santri_ids()));

-- SANTRI / ORANG TUA (baca data anaknya sendiri)
drop policy if exists "Santri read profiles" on profiles;
create policy "Santri read profiles" on profiles for select using (user_role() = 'SANTRI' and id = auth.uid());
drop policy if exists "Santri read santri" on santri;
create policy "Santri read santri" on santri for select using (user_role() = 'SANTRI' and id = public.anak_santri_id());
drop policy if exists "Santri read kelompok" on kelompok;
create policy "Santri read kelompok" on kelompok for select using (user_role() = 'SANTRI' and id = (select kelompok_id from santri where id = public.anak_santri_id()));
drop policy if exists "Santri read jadwal" on jadwal;
create policy "Santri read jadwal" on jadwal for select using (user_role() = 'SANTRI' and kelompok_id = (select kelompok_id from santri where id = public.anak_santri_id()));
drop policy if exists "Santri read presensi" on presensi;
create policy "Santri read presensi" on presensi for select using (user_role() = 'SANTRI' and santri_id = public.anak_santri_id());
drop policy if exists "Santri read bacaan" on perkembangan_bacaan;
create policy "Santri read bacaan" on perkembangan_bacaan for select using (user_role() = 'SANTRI' and santri_id = public.anak_santri_id());
drop policy if exists "Santri read hafalan_santri" on hafalan_santri;
create policy "Santri read hafalan_santri" on hafalan_santri for select using (user_role() = 'SANTRI' and santri_id = public.anak_santri_id());
drop policy if exists "Santri read cicilan" on hafalan_surat_cicilan;
create policy "Santri read cicilan" on hafalan_surat_cicilan for select using (user_role() = 'SANTRI' and hafalan_santri_id in (select id from hafalan_santri where santri_id = public.anak_santri_id()));
drop policy if exists "Santri read hafalan_doa" on perkembangan_hafalan_doa;
create policy "Santri read hafalan_doa" on perkembangan_hafalan_doa for select using (user_role() = 'SANTRI' and santri_id = public.anak_santri_id());
drop policy if exists "Santri read salat_komponen" on perkembangan_salat_komponen;
create policy "Santri read salat_komponen" on perkembangan_salat_komponen for select using (user_role() = 'SANTRI' and santri_id = public.anak_santri_id());
drop policy if exists "Santri read praktik_salat" on praktik_salat;
create policy "Santri read praktik_salat" on praktik_salat for select using (user_role() = 'SANTRI' and santri_id = public.anak_santri_id());