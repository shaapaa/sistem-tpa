# Test Case Black-Box — Sistem Monitoring TPA Baitul Yatama

Hasil penyesuaian dengan sistem yang berjalan. ID dipakai sebagai nama test di Playwright.

Kredensial uji (default, dapat diubah via environment variable):
- Admin: `admin@tpa-baitulyatama.local` / `admin123`
- Pengajar: `pak-hamid@tpa-baitulyatama.local` / `hamid123`
- Orang tua: `harisya@tpa-baitulyatama.local` / `harisya123`

| No | Role | Halaman | ID | Jenis | Skenario | Hasil yang diharapkan |
|----|------|---------|----|-------|----------|------------------------|
| 1 | Admin | Login | ADM-LOGIN-01 | Positif | Login dengan kredensial admin valid | Masuk dan diarahkan ke Dashboard Admin |
| 2 | Admin | Login | ADM-LOGIN-02 | Negatif | Login dengan password salah | Login ditolak + pesan kesalahan |
| 3 | Admin | Dashboard | ADM-DASH-01 | Positif | Buka Dashboard Admin | Ringkasan sistem tampil (Santri, Pengajar, Sesi, Kehadiran) |
| 4 | Admin | Santri | ADM-SANTRI-01 | Positif | Tambah santri data lengkap → Simpan | Santri tersimpan & muncul di daftar |
| 5 | Admin | Santri | ADM-SANTRI-03 | Positif | Edit santri → ubah nama → Simpan | Perubahan tersimpan |
| 6 | Admin | Santri | ADM-SANTRI-04 | Positif | Hapus santri → konfirmasi | Santri terhapus dari daftar |
| 7 | Admin | Santri | ADM-SANTRI-05 | Positif | Tandai santri Non-aktif | Badge Non-aktif muncul & hilang dari daftar pengajar |
| 8 | Admin | Santri | ADM-SANTRI-06 | Positif | Klik Detail (ikon mata) | Dialog detail santri tampil |
| 9 | Admin | Pengajar | ADM-PENGAJAR-01 | Positif | Buka Manajemen Pengajar | Daftar pengajar tampil |
| 10 | Admin | Pengajar | ADM-PENGAJAR-02 | Positif | Tambah pengajar (nama, JK, HP, alamat) → Simpan | Pengajar tersimpan (tanpa akun) |
| 11 | Admin | Pengajar | ADM-PENGAJAR-04 | Positif | Edit pengajar → ubah → Simpan | Data pengajar diperbarui |
| 12 | Admin | Pengajar | ADM-PENGAJAR-05 | Positif | Hapus pengajar → konfirmasi | Pengajar terhapus |
| 13 | Admin | Pengajar | ADM-PENGAJAR-07 | Positif | Lihat kartu pengajar | Kartu menampilkan kelompok + jumlah santri |
| 14 | Admin | Kelompok | ADM-KEL-01 | Positif | Buka Manajemen Kelompok | Daftar kelompok per sesi tampil |
| 15 | Admin | Kelompok | ADM-KEL-02 | Positif | Tambah kelompok → pilih sesi → Simpan | Kelompok bertambah |
| 16 | Admin | Kelompok | ADM-KEL-03 | Negatif | Simpan tanpa pilih sesi | Ditolak + validasi "Pilih sesi" |
| 17 | Admin | Kelompok | ADM-KEL-04 | Positif | Edit kelompok → ubah pengajar → Simpan | Kelompok diperbarui |
| 18 | Admin | Kelompok | ADM-KEL-05 | Positif | Hapus kelompok → konfirmasi | Kelompok terhapus |
| 19 | Admin | Jadwal | ADM-JADWAL-01 | Positif | Buka Manajemen Jadwal | Grid jadwal per hari tampil |
| 20 | Admin | Jadwal | ADM-JADWAL-02 | Positif | Tambah jadwal → pilih kelompok → hari → Simpan | Jadwal tersimpan |
| 21 | Admin | Jadwal | ADM-JADWAL-03 | Negatif | Simpan tanpa kelompok/hari | Ditolak + validasi |
| 22 | Admin | Jadwal | ADM-JADWAL-04 | Positif | Edit jadwal → ubah → Simpan | Jadwal diperbarui |
| 23 | Admin | Jadwal | ADM-JADWAL-05 | Positif | Hapus jadwal → konfirmasi | Jadwal terhapus |
| 24 | Admin | Profil & Akun | ADM-AKUN-01 | Positif | Buka Profil & Akun | Daftar akun & profil tampil |
| 25 | Admin | Profil & Akun | ADM-AKUN-02 | Positif | Tambah akun (pilih peran + relasi) → Simpan | Akun dibuat |
| 26 | Admin | Profil & Akun | ADM-AKUN-03 | Negatif | Simpan tanpa nama/password | Ditolak + validasi |
| 27 | Admin | Profil & Akun | ADM-AKUN-04 | Positif | Edit akun → ubah → Simpan | Akun diperbarui |
| 28 | Admin | Profil & Akun | ADM-AKUN-05 | Positif | Hapus akun → konfirmasi | Akun terhapus |
| 29 | Pengajar | Dashboard | PG-DASH-01 | Positif | Login pengajar → dashboard | Info relevan pengajar tampil |
| 30 | Pengajar | Jadwal | PG-JADWAL-01 | Positif | Buka Jadwal Mengajar | Jadwal pengajar tampil |
| 31 | Pengajar | Presensi | PG-PRES-01 | Positif | Pilih tanggal → tandai status → Simpan | Kehadiran tersimpan |
| 32 | Pengajar | Presensi | PG-PRES-02 | Positif | Input perkembangan pada tanggal yang sama | Presensi otomatis tercatat Hadir |
| 33 | Pengajar | Rekap | PG-REKAP-01 | Positif | Buka Rekap Perkembangan | Riwayat perkembangan tampil |
| 34 | Pengajar | Perkembangan | PG-BACA-01 | Positif | Input perkembangan bacaan → Simpan | Bacaan tersimpan |
| 35 | Pengajar | Perkembangan | PG-HAF-01 | Positif | Input hafalan surat → Simpan | Hafalan tersimpan |
| 36 | Pengajar | Perkembangan | PG-HAF-02 | Negatif | Simpan hafalan tanpa pilih surat | Ditolak + validasi |
| 37 | Pengajar | Perkembangan | PG-SALAT-01 | Positif | Input praktik salat → Simpan | Praktik salat tersimpan |
| 38 | Pengajar | Laporan | PG-LAP-01 | Positif | Pilih santri + periode → Tampilkan | Laporan (capaian, bacaan, hafalan, doa, salat, kehadiran) tampil + PDF |
| 39 | Orang Tua | Dashboard | OT-DASH-01 | Positif | Login orang tua → dashboard | Info anak yang terhubung tampil |
| 40 | Orang Tua | Perkembangan | OT-PERK-01 | Positif | Buka Perkembangan | Perkembangan anak tampil |
| 41 | Orang Tua | Profil Anak | OT-PROFIL-01 | Positif | Buka Data Anak | Profil anak tampil |
| 42 | Orang Tua | Laporan | OT-LAP-01 | Positif | Buka Laporan + pilih periode | Laporan + capaian tampil |
| 43 | Orang Tua | Keamanan | OT-AKSES-02 | Negatif | Buka dashboard | Hanya data anak sendiri yang tampil |

## Catatan penyesuaian
- **Dihapus**: PG-PRES-03 (tidak ada jalur simpan-kosong), PG-BACA-02 & PG-SALAT-02 (form tidak memvalidasi field wajib).
- **Ditambahkan**: ADM-SANTRI-05, ADM-SANTRI-06, ADM-PENGAJAR-07 (fitur baru).
- **Catatan**: tambah pengajar = data saja (tanpa password); akun dibuat di Profil & Akun. Presensi otomatis Hadir bila ada inputan perkembangan.
