# Monitoring Dashboards (Pengajar & Admin)

## Goal

Provide monitoring dashboards for Pengajar and Admin that surface the information needed for daily monitoring, follow-up, and evaluation toward parents.

## Pengajar Dashboard (/pengajar) — scoped to santri in the pengajar's sesi

1. MetricRail cards: Santri, Jadwal aktif, Perkembangan bulan ini, Tingkat kehadiran.
2. Jadwal mengajar list (hari, sesi, jam).
3. Charts (Recharts):
   - Donut: distribusi kehadiran (Hadir/Izin/Sakit/Alpha).
   - Bar: distribusi perkembangan bulan ini (Bacaan/Hafalan/Praktik Sholat).
4. "Anak yang butuh perhatian": santri whose latest perkembangan is KURANG, or alpha count >= 2 in the last 30 days; each with a short reason and a link to input perkembangan.
5. Perkembangan terbaru: recent perkembangan entries as a quick history.

## Admin Dashboard (/admin) — whole TPA

1. MetricRail cards: Santri, Pengajar, Jadwal, Akun Orang Tua.
2. Charts (Recharts):
   - Donut: distribusi kehadiran global.
   - Bar: distribusi santri per sesi (Pagi/Sore).
   - Bar: distribusi perkembangan per tipe.
3. "Santri butuh perhatian": latest KURANG or alpha >= 2 in last 30 days, whole TPA.
4. Ringkasan aktivitas: jumlah perkembangan & presensi bulan ini.

## Data sources (no schema change)

santris, pengajars, jadwals, absensis (status), perkembangan_santris (tipe_perkembangan, penilaian, tanggal, student_id), orang_tuas (count linked parents).
