import { test, expect, login, pickSelect } from "./helpers"

const SANTRI = process.env.E2E_PENGAJAR_SANTRI || "Elma"

test.describe("Pengajar", () => {
  test("PG-DASH-01 Dashboard pengajar", async ({ page }) => {
    await login(page, "pengajar")
    await expect(page.getByText("Jadwal aktif")).toBeVisible()
    await expect(page.getByText("Anak yang butuh perhatian")).toBeVisible()
  })

  test("PG-JADWAL-01 Jadwal mengajar", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/jadwal")
    await expect(page.getByText("Jadwal Anda")).toBeVisible()
  })

  test("PG-PRES-01 Presensi manual tersimpan", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/presensi")
    const izinBtn = page.getByRole("button", { name: "Izin" }).first()
    if ((await izinBtn.count()) > 0) {
      await izinBtn.click()
      await expect(izinBtn).toHaveClass(/bg-primary/)
    }
    await expect(page.getByRole("button", { name: "Hadir" }).first()).toBeVisible()
  })

  test("PG-REKAP-01 Rekap perkembangan", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/rekap-perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await expect(page.getByText(/Riwayat Perkembangan/)).toBeVisible()
  })

  test("PG-BACA-01 Input perkembangan bacaan", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await pickSelect(page, "Jilid", "Jilid 3")
    await page.getByPlaceholder("Nomor halaman").fill("12")
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Tersimpan")).toBeVisible()
  })

  test("PG-BACA-02 Tolak bacaan tanpa jilid/halaman", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Jilid dan halaman wajib diisi")).toBeVisible()
  })

  test("PG-HAF-01 Input hafalan surat", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await page.getByRole("tab", { name: "Hafalan" }).click()
    const surahBtn = page.locator('button:has-text("Pilih surah")')
    await surahBtn.scrollIntoViewIfNeeded()
    await surahBtn.click()
    await page.locator('input[placeholder="Cari..."]').fill("An-Nas")
    await page.locator('div.fixed.z-\\[70\\] button').filter({ hasText: "An-Nas" }).first().evaluate((el) => (el as HTMLElement).click())
    await page.getByPlaceholder("Ayat terakhir").fill("3")
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Tersimpan")).toBeVisible()
  })

  test("PG-HAF-02 Tolak hafalan tanpa pilih surat", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await page.getByRole("tab", { name: "Hafalan" }).click()
    await page.getByPlaceholder("Ayat terakhir").fill("5")
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Pilih surah terlebih dahulu")).toBeVisible()
  })

  test("PG-SALAT-01 Input praktik salat", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await page.getByRole("tab", { name: "Praktik Salat" }).click()
    await pickSelect(page, "Jenis Salat (Level 2)", "Subuh")
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Tersimpan")).toBeVisible()
  })

  test("PG-SALAT-02 Tolak salat tanpa pilih jenis salat", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await page.getByRole("tab", { name: "Praktik Salat" }).click()
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Pilih minimal satu jenis salat")).toBeVisible()
  })

  test("PG-LAP-01 Laporan perkembangan santri", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/laporan")
    await page.locator('button:has-text("Pilih santri")').click()
    await page.locator('div.fixed.z-\\[70\\] button').filter({ hasText: SANTRI }).first().evaluate((el) => (el as HTMLElement).click())
    await page.getByRole("button", { name: "Tampilkan Laporan" }).click()
    await expect(page.getByRole("heading", { name: "Capaian Santri" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Perkembangan Bacaan" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Hafalan Surat" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Kehadiran" })).toBeVisible()
  })

  test("PG-PRES-02 Input perkembangan → presensi otomatis Hadir", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await pickSelect(page, "Jilid", "Jilid 4")
    await page.getByPlaceholder("Nomor halaman").fill("10")
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Tersimpan")).toBeVisible()
    await page.goto("/pengajar/presensi")
    const row = page.locator("div", { hasText: SANTRI })
    await expect(row.filter({ hasText: "Hadir" }).first()).toBeVisible()
  })

  test("PG-REKAP-02 Filter rekap: Semua Santri tidak kosong", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/rekap-perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.locator('button:has-text("Semua santri")').click()
    await page.getByRole("option", { name: SANTRI, exact: true }).click()
    await page.waitForTimeout(600)
    const filtered = await page.locator("text=Riwayat Perkembangan (").innerText()
    await page.locator('button:has-text("' + SANTRI + '")').click()
    await page.getByRole("option", { name: "Semua Santri", exact: true }).click()
    await page.waitForTimeout(800)
    const all = await page.locator("text=Riwayat Perkembangan (").innerText()
    const nAll = parseInt(all.match(/\((\d+)\)/)?.[1] ?? "0", 10)
    void filtered
    expect(nAll).toBeGreaterThan(0)
  })

  test("PG-HAF-03 Tolak hafalan ayat melebihi jumlah ayat surat", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await page.getByRole("tab", { name: "Hafalan" }).click()
    const surahBtn = page.locator('button:has-text("Pilih surah")')
    await surahBtn.scrollIntoViewIfNeeded()
    await surahBtn.click()
    await page.locator('input[placeholder="Cari..."]').fill("An-Nas")
    await page.locator('div.fixed.z-\\[70\\] button').filter({ hasText: "An-Nas (6 ayat)" }).first().evaluate((el) => (el as HTMLElement).click())
    await page.getByPlaceholder("Ayat terakhir").fill("7")
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText(/melebihi jumlah ayat/)).toBeVisible()
  })

  test("PG-AKSES-01 Hanya santri kelompok sendiri yang tampil", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.waitForTimeout(600)
    const body = await page.locator("body").innerText()
    const leaking = ["Harisya", "Tama Fasha"].filter((n) => body.includes(n))
    expect(leaking, `Santri lain bocor: ${leaking.join(", ")}`).toHaveLength(0)
    await expect(page.getByRole("button", { name: new RegExp(SANTRI) }).first()).toBeVisible()
  })

  test("PG-LAP-02 Cetak laporan PDF", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/laporan")
    await page.locator('button:has-text("Pilih santri")').click()
    await page.locator('div.fixed.z-\\[70\\] button').filter({ hasText: SANTRI }).first().evaluate((el) => (el as HTMLElement).click())
    await page.getByRole("button", { name: "Tampilkan Laporan" }).click()
    await expect(page.getByRole("heading", { name: "Capaian Santri" })).toBeVisible()
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Cetak PDF" }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })

  test("PG-HAF-04 Input hafalan doa", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await page.getByRole("tab", { name: "Hafalan" }).click()
    await pickSelect(page, "Jenis Hafalan", "Hafalan Doa")
    const doaBtn = page.locator('button:has-text("Pilih doa")')
    await doaBtn.scrollIntoViewIfNeeded()
    await doaBtn.click()
    await page.locator('div.fixed.z-\\[70\\] button').first().evaluate((el) => (el as HTMLElement).click())
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Tersimpan")).toBeVisible()
  })

  test("PG-HAF-05 Tolak hafalan doa tanpa pilih doa", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await page.getByRole("tab", { name: "Hafalan" }).click()
    await pickSelect(page, "Jenis Hafalan", "Hafalan Doa")
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Pilih doa terlebih dahulu")).toBeVisible()
  })

  test("PG-SALAT-03 Input komponen salat (Level 1)", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await page.getByRole("tab", { name: "Praktik Salat" }).click()
    await page.getByRole("button", { name: "Lancar", exact: true }).first().click()
    await pickSelect(page, "Jenis Salat (Level 2)", "Subuh")
    await page.getByRole("button", { name: "Simpan", exact: true }).first().click()
    await expect(page.getByText("Tersimpan")).toBeVisible()
  })

  test("PG-GANTI-01 Kembali ke daftar santri (Ganti santri)", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    await page.getByRole("button", { name: new RegExp(SANTRI) }).click()
    await expect(page.getByRole("button", { name: "Ganti santri" })).toBeVisible()
    await page.getByRole("button", { name: "Ganti santri" }).click()
    await expect(page.getByRole("button", { name: new RegExp(SANTRI) }).first()).toBeVisible()
  })

  test("PG-AUTH-01 Pengajar tidak bisa akses halaman admin", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/admin")
    await expect(page).not.toHaveURL(/admin/, { timeout: 10_000 })
  })

  test("PG-REKAP-03 Filter rekap berdasarkan tanggal", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/rekap-perkembangan")
    await pickSelect(page, "Kelompok", "Kelompok A")
    // pilih tanggal 1 bulan ini (tanpa data) -> filter bekerja
    await page.locator('button:has(.lucide-calendar-days)').click()
    await page.locator('button:text-is("1")').first().click()
    await page.waitForTimeout(800)
    await expect(page.getByText("Belum ada data perkembangan")).toBeVisible()
  })

  test("PG-LAP-03 Cetak PDF dinonaktifkan saat data kosong", async ({ page }) => {
    await login(page, "pengajar")
    await page.goto("/pengajar/laporan")
    await page.locator('button:has-text("Pilih santri")').click()
    await page.locator('div.fixed.z-\\[70\\] button').filter({ hasText: SANTRI }).first().evaluate((el) => (el as HTMLElement).click())
    // periode tanpa data: 1-5 Sep (data santri hari ini, bukan rentang ini)
    await page.locator('button:has(.lucide-calendar-days)').nth(1).click()
    await page.locator('button:text-is("5")').first().click()
    await page.getByRole("button", { name: "Tampilkan Laporan" }).click()
    await expect(page.getByText("Belum ada laporan").or(page.getByRole("heading", { name: "Capaian Santri" }))).toBeVisible()
    await expect(page.getByRole("button", { name: "Cetak PDF" })).toBeDisabled()
  })
})
