-- ============================================================================
-- MIGRATION: Drop sisa tabel lama (seluruh frontend sudah di tabel baru)
--
-- Semua data sudah dipindahkan ke tabel target:
--   pengajars             -> pengajar
--   santris               -> santri
--   absensis + pertemuans -> presensi
--   jadwals               -> jadwal
--   perkembangan_santris  -> perkembangan_bacaan / hafalan_santri +
--                            hafalan_surat_cicilan / perkembangan_hafalan_doa /
--                            perkembangan_salat_komponen / praktik_salat
--   orang_tuas            -> santri.profile_id (akun role SANTRI)
-- ============================================================================
drop table if exists orang_tuas cascade;
drop table if exists absensis cascade;
drop table if exists pertemuans cascade;
drop table if exists perkembangan_santris cascade;
drop table if exists jadwals cascade;
drop table if exists santris cascade;
drop table if exists pengajars cascade;