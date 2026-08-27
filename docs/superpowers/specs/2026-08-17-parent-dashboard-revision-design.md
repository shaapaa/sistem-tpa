# Parent Dashboard Revision

## Goal

Show the parent a set of tappable summary cards covering the child's Islamic character development (attendance, hafalan surat, hafalan doa, bacaan, praktik sholat). Tapping a card expands an inline accordion showing detailed records from the data.

## Design

- Keep the period filter (Minggu/Bulan/3 Bulan/Tahun).
- Show a child identity card.
- Show a grid of clickable summary cards, one per aspect:
  1. Presensi (attendance % + hadir/izin/sakit/alpha) -> expand list of attendance per meeting date.
  2. Hafalan Surat (count) -> expand list of surah hafalan records (nama_surah, penilaian, tanggal, catatan).
  3. Hafalan Doa (count) -> expand list of doa records (nama_doa, penilaian, tanggal, catatan).
  4. Bacaan (count) -> expand list of bacaan records (Iqra/Quran detail, penilaian, tanggal, catatan).
  5. Praktik Sholat (count) -> expand list of sholat records (jenis_sholat, penilaian, tanggal, catatan).
- Expand is an inline accordion (only one open at a time per card, toggled).
- Keep the quality distribution section (Baik/Cukup Baik/Perlu Perbaikan).
- Remove the old generic "Riwayat Terbaru" list in favor of the accordion details.
