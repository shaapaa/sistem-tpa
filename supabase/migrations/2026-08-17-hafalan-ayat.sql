-- Add per-ayat installment tracking to hafalan surah records
alter table perkembangan_santris
  add column if not exists ayat_mulai int,
  add column if not exists ayat_selesai int;
