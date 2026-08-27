# Admin Dashboard Revision

## Goal

Revise the admin dashboard to show the key monitoring metrics with period + sesi filters.

## Layout

1. MetricRail cards:
   - Santri Aktif (all santris)
   - Pengajar Aktif
   - Santri Sesi Pagi
   - Santri Sesi Sore
2. Filter bar:
   - Periode: Hari Ini / Minggu Ini / Bulan Ini / Custom (two DatePickers when Custom)
   - Sesi: Semua / Pagi / Sore
3. Ringkasan kehadiran (filtered by periode + sesi):
   - 4 small cards: Hadir, Izin, Sakit, Alpha
   - Percentage card (tingkat kehadiran)
   - Donut chart of the distribution
4. Jadwal pengajar table: Hari, Sesi, Nama Pengajar (from jadwals join pengajars).
5. Santri butuh perhatian section (kept).
6. Aktivitas bulan ini summary (kept, optional).

## Filtering

- Attendance rows filtered by pertemuan tanggal within the selected period and student sesi in the selected sesi.
- Santri counts and jadwal are static (not period-filtered).
