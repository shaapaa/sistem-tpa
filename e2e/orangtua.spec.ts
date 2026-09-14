import { test, expect, login } from "./helpers"

test.describe("Orang Tua", () => {
  test("OT-DASH-01 Dashboard orang tua", async ({ page }) => {
    await login(page, "orangtua")
    await expect(page.getByText("Capaian Santri", { exact: true })).toBeVisible()
    await expect(page.getByText(/Kehadiran/).first()).toBeVisible()
  })

  test("OT-PERK-01 Perkembangan anak", async ({ page }) => {
    await login(page, "orangtua")
    await page.goto("/orang-tua/perkembangan")
    await expect(page.getByRole("tab", { name: "Hafalan Surat" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Praktik Salat" })).toBeVisible()
  })

  test("OT-PROFIL-01 Profil anak", async ({ page }) => {
    await login(page, "orangtua")
    await page.goto("/orang-tua/anak")
    await expect(page.getByRole("heading", { name: "Informasi Kelas" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Informasi Orang Tua" })).toBeVisible()
  })

  test("OT-PRES-01 Presensi anak", async ({ page }) => {
    await login(page, "orangtua")
    await page.goto("/orang-tua/presensi")
    await expect(page.getByRole("heading", { name: "Presensi" })).toBeVisible()
    await expect(page.getByText("Bulan", { exact: true })).toBeVisible()
    await expect(page.getByText("Tahun", { exact: true })).toBeVisible()
    await expect(page.getByText("Hadir", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Total", { exact: true }).first()).toBeVisible()
  })

  test("OT-LAP-01 Laporan anak", async ({ page }) => {
    await login(page, "orangtua")
    await page.goto("/orang-tua/laporan")
    await expect(page.getByText("Tanggal mulai")).toBeVisible()
    // periode Agustus (data harisya di Agustus)
    await page.locator('button:has(.lucide-calendar-days)').first().click()
    await page.locator('button:has(.lucide-chevron-left)').first().click()
    await page.locator('button:text-is("1")').first().click()
    await page.locator('button:has(.lucide-calendar-days)').nth(1).click()
    await page.locator('button:has(.lucide-chevron-left)').first().click()
    await page.locator('button:text-is("31")').first().click()
    await expect(page.getByRole("heading", { name: "Capaian Santri" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Perkembangan Bacaan" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Hafalan Surat" })).toBeVisible()
  })

  test("OT-LAP-02 Cetak laporan PDF", async ({ page }) => {
    await login(page, "orangtua")
    await page.goto("/orang-tua/laporan")
    await expect(page.getByText("Tanggal mulai")).toBeVisible()
    // periode Agustus (data harisya)
    await page.locator('button:has(.lucide-calendar-days)').first().click()
    await page.locator('button:has(.lucide-chevron-left)').first().click()
    await page.locator('button:text-is("1")').first().click()
    await page.locator('button:has(.lucide-calendar-days)').nth(1).click()
    await page.locator('button:has(.lucide-chevron-left)').first().click()
    await page.locator('button:text-is("31")').first().click()
    await expect(page.getByRole("heading", { name: "Capaian Santri" })).toBeVisible()
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Cetak PDF" }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })

  test("OT-AKSES-02 Hanya data anak sendiri yang tampil", async ({ page }) => {
    await login(page, "orangtua")
    const body = await page.locator("body").innerText()
    await expect(page.getByText(/Harisya/).first()).toBeVisible()
    const leaking = ["Elma", "Tama Fasha"].filter((n) => body.includes(n))
    expect(leaking, `Data santri lain bocor: ${leaking.join(", ")}`).toHaveLength(0)
  })
})