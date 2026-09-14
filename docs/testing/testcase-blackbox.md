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
| 15 | Admin | Kelompok | ADM-KEL-02 | Positif (manual) | Tambah kelompok → pilih sesi → Simpan *(manual: semua slot A/B penuh)* | Data kelompok valid | Kelompok bertambah |
| 16 | Admin | Kelompok | ADM-KEL-03 | Negatif | Pilih sesi kelompok yang sudah memiliki kelompok → lakukan penyimpanan | Kelompok pada sesi sudah tersedia | Sistem menolak penyimpanan dan menampilkan pesan bahwa kelompok sudah ada pada sesi tersebut |
| 17 | Admin | Kelompok | ADM-KEL-04 | Positif | Edit kelompok → ubah pengajar → Simpan | Kelompok diperbarui |
| 18 | Admin | Kelompok | ADM-KEL-05 | Positif (manual) | Hapus kelompok → konfirmasi *(manual: menghapus kelompok men-set santri tanpa kelompok, tidak dapat di-restore via UI)* | Kelompok terpilih | Kelompok terhapus |
| 19 | Admin | Jadwal | ADM-JADWAL-01 | Positif | Buka Manajemen Jadwal | Grid jadwal per hari tampil |
| 20 | Admin | Jadwal | ADM-JADWAL-02 | Positif (manual) | Tambah jadwal → pilih kelompok → hari → Simpan *(manual: semua slot terisi)* | Data jadwal valid | Jadwal tersimpan |
| 21 | Admin | Jadwal | ADM-JADWAL-03 | Negatif | Simpan tanpa kelompok/hari | Ditolak + validasi |
| 22 | Admin | Jadwal | ADM-JADWAL-04 | Positif | Edit jadwal → ubah → Simpan | Jadwal diperbarui |
| 23 | Admin | Jadwal | ADM-JADWAL-05 | Positif | Hapus jadwal → konfirmasi | Jadwal terhapus |
| 24 | Admin | Profil & Akun | ADM-AKUN-01 | Positif | Buka Profil & Akun | Daftar akun & profil tampil |
| 25 | Admin | Profil & Akun | ADM-AKUN-02 | Positif | Tambah akun (pilih peran + relasi) → Simpan | Akun dibuat |
| 26 | Admin | Profil & Akun | ADM-AKUN-03 | Negatif | Simpan tanpa nama/password | Ditolak + validasi |
| 27 | Admin | Profil & Akun | ADM-AKUN-04 | Positif | Edit akun → ubah → Simpan | Akun diperbarui |
| 28 | Admin | Profil & Akun | ADM-AKUN-05 | Positif | Hapus akun → konfirmasi | Akun terhapus |
| 29 | Admin | Autentikasi | ADM-LOGOUT-01 | Positif | Logout → buka kembali halaman admin | Sesion aktif | Logout berhasil, session hilang, diarahkan ke login |
| 30 | Admin | Autentikasi | ADM-AUTH-01 | Positif | Buka /admin tanpa login | Tanpa sesi | Diarahkan ke halaman login |
| 31 | Admin | Autentikasi | ADM-AUTH-02 | Positif | Login admin → buka /pengajar dan /orang-tua | Role admin | Akses ditolak (tidak bisa membuka halaman pengajar/orang tua) |
| 32 | Pengajar | Dashboard | PG-DASH-01 | Positif | Login pengajar → dashboard | Info relevan pengajar tampil |
| 33 | Pengajar | Jadwal | PG-JADWAL-01 | Positif | Buka Jadwal Mengajar | Jadwal pengajar tampil |
| 34 | Pengajar | Akses | PG-AKSES-01 | Positif | Buka perkembangan → lihat daftar santri | Hanya santri kelompok sendiri yang tampil |
| 35 | Pengajar | Autentikasi | PG-AUTH-01 | Positif | Login pengajar → buka /admin | Role pengajar | Akses ditolak (tidak bisa membuka halaman admin) |
| 36 | Pengajar | Presensi | PG-PRES-01 | Positif | Pilih tanggal → tandai status → Simpan | Kehadiran tersimpan |
| 37 | Pengajar | Presensi | PG-PRES-02 | Positif | Input perkembangan pada tanggal yang sama | Presensi otomatis tercatat Hadir |
| 38 | Pengajar | Rekap | PG-REKAP-01 | Positif | Buka Rekap Perkembangan | Riwayat perkembangan tampil |
| 39 | Pengajar | Rekap | PG-REKAP-02 | Positif | Pilih santri → kembali ke "Semua Santri" | Data tidak kosong saat "Semua Santri" |
| 40 | Pengajar | Rekap | PG-REKAP-03 | Positif | Pilih tanggal filter rekap | Data di tanggal tertentu | Data tersaring sesuai tanggal |
| 41 | Pengajar | Perkembangan | PG-BACA-01 | Positif | Input perkembangan bacaan → Simpan | Bacaan tersimpan |
| 42 | Pengajar | Perkembangan | PG-BACA-02 | Negatif | Simpan bacaan tanpa jilid/halaman (Iqra) atau surat/juz (Al-Qur'an) | Ditolak + validasi |
| 43 | Pengajar | Perkembangan | PG-HAF-01 | Positif | Input hafalan surat → Simpan | Hafalan tersimpan |
| 44 | Pengajar | Perkembangan | PG-HAF-02 | Negatif | Simpan hafalan tanpa pilih surat | Ditolak + validasi |
| 45 | Pengajar | Perkembangan | PG-HAF-03 | Negatif | Isi ayat selesai melebihi jumlah ayat surat | Ditolak + validasi |
| 46 | Pengajar | Perkembangan | PG-HAF-04 | Positif | Input hafalan doa → Simpan | Hafalan doa tersimpan |
| 47 | Pengajar | Perkembangan | PG-HAF-05 | Negatif | Simpan hafalan doa tanpa pilih doa | Ditolak + validasi |
| 48 | Pengajar | Perkembangan | PG-SALAT-01 | Positif | Input praktik salat → Simpan | Praktik salat tersimpan |
| 49 | Pengajar | Perkembangan | PG-SALAT-02 | Negatif | Simpan praktik salat tanpa pilih jenis salat | Ditolak + validasi |
| 50 | Pengajar | Perkembangan | PG-SALAT-03 | Positif | Tandai komponen salat (Level 1) → Simpan | Komponen salat tersimpan |
| 51 | Pengajar | Perkembangan | PG-GANTI-01 | Positif | Klik "Ganti santri" | Kembali ke daftar santri |
| 52 | Pengajar | Laporan | PG-LAP-01 | Positif | Pilih santri + periode → Tampilkan | Laporan (capaian, bacaan, hafalan, doa, salat, kehadiran) tampil |
| 53 | Pengajar | Laporan | PG-LAP-02 | Positif | Cetak laporan PDF | PDF berhasil diunduh |
| 54 | Pengajar | Laporan | PG-LAP-03 | Positif | Cetak PDF saat data laporan kosong | Data kosong | Tombol Cetak PDF dinonaktifkan |
| 55 | Orang Tua | Dashboard | OT-DASH-01 | Positif | Login orang tua → dashboard | Info anak yang terhubung tampil |
| 56 | Orang Tua | Perkembangan | OT-PERK-01 | Positif | Buka Perkembangan | Perkembangan anak tampil |
| 57 | Orang Tua | Profil Anak | OT-PROFIL-01 | Positif | Buka Data Anak | Profil anak tampil |
| 58 | Orang Tua | Presensi | OT-PRES-01 | Positif | Buka Presensi | Rekap kehadiran anak + filter bulan/tahun tampil |
| 59 | Orang Tua | Laporan | OT-LAP-01 | Positif | Buka Laporan + pilih periode | Laporan menampilkan capaian, bacaan, hafalan surat, hafalan doa, praktik salat, kehadiran sesuai data |
| 60 | Orang Tua | Laporan | OT-LAP-02 | Positif | Cetak laporan PDF | PDF berhasil diunduh |
| 61 | Orang Tua | Keamanan | OT-AKSES-02 | Negatif | Buka dashboard | Hanya data anak sendiri yang tampil |

## Catatan penyesuaian
- **Dihapus**: PG-PRES-03 (tidak ada jalur simpan-kosong di presensi).
- **Validasi ditambahkan (sistem)**: bacaan (Iqra wajib jilid+halaman; Al-Qur'an wajib surat+juz) & praktik salat (wajib minimal satu jenis salat) → PG-BACA-02 & PG-SALAT-02 kini valid.
- **Ditambahkan (admin)**: ADM-SANTRI-05, ADM-SANTRI-06, ADM-PENGAJAR-07 (fitur baru); ADM-JADWAL-04/05 & ADM-AKUN-04.
- **Ditambahkan (pengajar)**: PG-PRES-02 (presensi otomatis hadir), PG-REKAP-02, PG-HAF-03, PG-HAF-04/05 (hafalan doa), PG-SALAT-03 (komponen Level 1), PG-AKSES-01, PG-GANTI-01, PG-LAP-02.
- **Ditambahkan (orang tua)**: OT-PRES-01 (presensi anak), OT-LAP-02 (cetak PDF). OT-LAP-01 tidak menyertakan "catatan/evaluasi pengajar" karena catatan tidak disimpan di sistem.
- **Ditambahkan (admin - autentikasi)**: ADM-LOGOUT-01, ADM-AUTH-01, ADM-AUTH-02.
- **PG-HAF-06 (ayat selesai < mulai) tidak dibuat**: "mulai dari ayat" otomatis mengikuti setoran terakhir sehingga kondisi tersebut tidak dapat di-trigger via UI.
- **Manual**: ADM-KEL-02, ADM-JADWAL-02 (slot data penuh), ADM-KEL-05 (efek hapus ke santri).
- **Catatan**: tambah pengajar = data saja (tanpa password); akun dibuat di Profil & Akun. Presensi otomatis Hadir bila ada inputan perkembangan.
