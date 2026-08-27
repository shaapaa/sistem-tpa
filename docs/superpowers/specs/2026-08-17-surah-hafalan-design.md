# Per-juz Surah Selection and Hafalan Surat/Doa Choice

## Goal

Improve the pengajar development input:
- For Al-Quran bacaan, when a Juz is selected the Surah dropdown only shows surahs in that juz.
- For Hafalan, let the pengajar choose between Hafalan Surat (Juz Amma + Al-Fatihah dropdown, with a free-text "Lainnya" option) or Hafalan Doa (daily dua dropdown).

## Design

- Add a `juzSurahs` mapping (juz 1..30 -> surah list) using the standard Quran juz boundaries. Keep it as a constant.
- Bacaan (QURAN): after selecting Juz, `quranForm.surah` becomes a Select populated from `juzSurahs[juz]`.
- Hafalan form: add `jenis_hafalan` ("SURAT" | "DOA").
  - SURAT: Select of Juz Amma surahs + Al-Fatihah, plus an option "Lainnya..." that reveals a free-text Input for any other surah.
  - DOA: Select of daily duas (a standard set commonly taught at TPA).
- Persist: SURAT -> `nama_surah`; DOA -> `nama_doa`. Existing `nama_doa` column is reused (it already exists in the schema but was unused).
- No schema change.

## Daily duas (Hafalan DOA set)

Before/after eating, waking/sleeping, entering/leaving toilet, entering/leaving house, entering/leaving mosque, before studying, before sleeping, for parents, riding a vehicle, entering the bathroom, after eating, and similar standard short duas taught at TPA.
