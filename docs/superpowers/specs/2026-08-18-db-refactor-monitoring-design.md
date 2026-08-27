# Refactor Skema Database Monitoring Santri TPA

## Tujuan

Menyelaraskan database lama (users/pengajars/santris/absensis/perkembangan_santris/dll) ke rancangan target 17 tabel, tanpa menghapus data yang relevan, dengan migration idempotent dan RLS per role.

## Keputusan yang disetujui

- Akun ORANG_TUA (4 user) menjadi profil role `SANTRI` dan langsung jadi `profile_id` santri; `orang_tuas` di-deprecate.
- Konvensi role huruf besar: `ADMIN`, `PENGAJAR`, `SANTRI`.
- Nama surat lama di-auto-match ke master `surat` (case-insensitive); yang tidak cocok → `surat_id` NULL + nama asli di `catatan`.
- 4 kelompok dibuat; 3 diisi pengajar (Fatimah→Pagi A, Hamid→Sore A, Maryam→Sore B), Pagi B kosong (nullable).
- Jadwal lama di-backfill via mapping pengajar→kelompok; baris pengajar_id NULL tidak dipindah.

## Pemetaan tabel

| Tabel target | Sumber | Tindakan |
|---|---|---|
| profiles | users | Rename + tambah nama; ORANG_TUA→SANTRI |
| pengajar | pengajars | Rename; profile_id FK |
| santri | santris | Rename; sesi(text)→kelompok_id FK |
| sesi | (baru) | Seed Pagi/Sore |
| kelompok | (baru) | Seed 4 kelompok |
| jadwal | jadwals | kelompok_id+hari; backfill via pengajar |
| presensi | absensis + pertemuans | Gabung; (santri_id,tanggal) unique |
| surat | (baru) | Master Juz 30 + Al-Fatihah |
| perkembangan_bacaan | progres_bacaans + perkembangan_santris(BACAAN) | Gabung |
| hafalan_santri + hafalan_surat_cicilan | hafalans + perkembangan_santris(HAFALAN) | Pindah; surat_id FK |
| doa | (baru) | Master doa |
| perkembangan_hafalan_doa | doa_harians + perkembangan_santris(HAFALAN doa) | Pindah; doa_id FK |
| komponen_salat | (baru) | Master 8 komponen |
| perkembangan_salat_komponen | (baru) | Backfill lossy dari praktik_sholats |
| jenis_salat | (baru) | Master 5 salat |
| praktik_salat | praktik_sholats | Backfill lossy: jenis_salat_id NULL + catatan skor |
| (deprecate) | evaluasis, pertemuans | Dipertahankan, tidak di-drop |

## Catatan kehilangan makna (data loss)

1. `praktik_sholats` (skor 4 kolom 0-100, tanpa jenis salat) tidak bisa dipetakan 1:1 ke master 8 komponen. Migrasi memindahkannya ke `praktik_salat` dengan `jenis_salat_id` NULL, status dari rata-rata skor (>=75 LANCAR, else BUTUH_BIMBINGAN), dan skor asli disimpan di `catatan`. Tidak di-drop.
2. `evaluasis` dan `pertemuans` tidak punya target; tabel dipertahankan (deprecate), tidak di-drop, agar data tidak hilang.
3. `hafalans` lama tidak punya rentang ayat → menjadi cicilan `evaluasi` dengan rentang 1..jumlah_ayat surat.
4. Santri lama tidak punya data kelompok → ditempatkan di kelompok A sesuai sesi (Pagi A / Sore A). Admin bisa menyesuaikan.

## RLS (ringkas)

- ADMIN: full pada profiles/pengajar/santri/sesi/kelompok/jadwal/master; **read-only** pada presensi & semua tabel perkembangan.
- PENGAJAR: read jadwal/kelompok/santri milik kelompoknya; write perkembangan & presensi untuk santri kelompoknya.
- SANTRI (orang tua): read data anaknya sendiri (santri, presensi, semua perkembangan).

## Dampak ke kode TypeScript (nanti)

- `users` → `profiles`, `pengajars`→`pengajar`, `santris`→`santri`, `absensis`→`presensi`, `jadwals`→`jadwal`, `perkembangan_santris`→pecah 6 tabel, `surat`/`doa`/`komponen_salat`/`jenis_salat` master.
- Relasi santri: `sesi` text → `kelompok_id`; sesi diturunkan dari kelompok.
- Role ORANG_TUA hilang → SANTRI.
- Helper RLS baru: `user_role()`, `pengajar_id()`, `pengajar_kelompok_ids()`, `anak_santri_id()`.