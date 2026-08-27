-- ============================================================================
-- MIGRATION: Cleanup tabel legacy + perbaiki kelompok santri berdasar bacaan
--
-- 1) Perbaiki kelompok santri: QURAN -> Kelompok B, IQRA -> Kelompok A
-- 2) Drop tabel lama yang sudah tidak dipakai frontend:
--    - users          (data sudah di-backfill ke profiles)
--    - progres_bacaans (-> perkembangan_bacaan)
--    - hafalans        (-> hafalan_santri + hafalan_surat_cicilan)
--    - doa_harians     (-> perkembangan_hafalan_doa)
--    - praktik_sholats (-> praktik_salat)
--    - evaluasis       (tidak ada target; 2 catatan lama)
-- ============================================================================

-- 1) Santri dengan jenis bacaan Al-Qur'an pindah ke Kelompok B (sesi sama)
update santri s
set kelompok_id = kb.id
from kelompok kb
where s.keterangan = 'QURAN'
  and kb.sesi_id = (select sesi_id from kelompok ka where ka.id = s.kelompok_id)
  and kb.nama = 'B'
  and s.kelompok_id is not null
  and not exists (select 1 from kelompok k2 where k2.id = s.kelompok_id and k2.nama = 'B');

-- 2) Drop tabel legacy (CASCADE otomatis melepas FK dependen)
drop table if exists users cascade;
drop table if exists progres_bacaans cascade;
drop table if exists hafalans cascade;
drop table if exists doa_harians cascade;
drop table if exists praktik_sholats cascade;
drop table if exists evaluasis cascade;