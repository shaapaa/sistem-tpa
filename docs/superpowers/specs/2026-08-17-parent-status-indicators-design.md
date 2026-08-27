# Parent Dashboard Status Indicators

## Goal

Make the parent dashboard more interactive by adding automatic status badges to each development card based on the data, so parents instantly see how their child is doing per aspect.

## Status rules

- **Presensi** (attendance rate):
  - No data -> "Belum ada data" (neutral)
  - >= 75% -> Baik (success)
  - 50-74% -> Cukup (warning)
  - < 50% -> Perlu Diperhatikan (destructive)
- **Hafalan Surat / Hafalan Doa / Bacaan / Praktik Sholat**:
  - Never had data -> "Belum ada data" (neutral)
  - Has entries in the selected period -> Baik (success), showing count
  - Had data before but no entries in the selected period -> "Perlu Diperhatikan — tidak ada kemajuan di periode ini" (warning)

Each card keeps the accordion detail on click.

## Data

- attendance rate from absensis.
- perkembangan_santris filtered by tipe_perkembangan and period.
