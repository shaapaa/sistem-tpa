import { test, expect, login, pickSelect, uniq } from "./helpers"

test.describe("Admin", () => {
  test("ADM-LOGIN-01 Login admin valid", async ({ page }) => {
    await login(page, "admin")
    await expect(page).toHaveURL(/\/admin/)
  })

  test("ADM-LOGIN-02 Login admin password salah", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL || "admin@tpa-baitulyatama.local")
    await page.getByLabel("Password").fill("salah-password-xyz")
    await page.getByRole("button", { name: "Masuk" }).click()
    await expect(page.getByRole("alert")).toBeVisible()
  })

  test("ADM-DASH-01 Dashboard admin menampilkan ringkasan", async ({ page }) => {
    await login(page, "admin")
    await expect(page.getByText("Santri Aktif")).toBeVisible()
    await expect(page.getByText("Pengajar Aktif")).toBeVisible()
    await expect(page.getByText("Aktivitas bulan ini")).toBeVisible()
  })

  test("ADM-SANTRI-01 Tambah santri", async ({ page }) => {
    const nama = uniq("Santri Uji")
    await login(page, "admin")
    await page.goto("/admin/santri")
    await page.getByRole("button", { name: "Tambah Santri" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("Nama lengkap santri").fill(nama)
    await pickSelect(page, "Jenis Kelamin", "Laki-laki")
    await pickSelect(page, "Sesi", "Pagi")
    await pickSelect(page, "Jenis Bacaan", "Iqra")
    await dialog.getByRole("button", { name: "Tambah Santri" }).click()
    await expect(page.getByText(nama)).toBeVisible()
    // cleanup
    const card = page.locator("div.grid > div", { hasText: nama })
    await card.locator("button").last().click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
    await expect(page.getByText(nama)).toHaveCount(0)
  })

  test("ADM-SANTRI-03 Edit santri", async ({ page }) => {
    const nama = uniq("Santri Edit")
    const namaBaru = `${nama} X`
    await login(page, "admin")
    await page.goto("/admin/santri")
    await page.getByRole("button", { name: "Tambah Santri" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("Nama lengkap santri").fill(nama)
    await pickSelect(page, "Jenis Kelamin", "Perempuan")
    await pickSelect(page, "Sesi", "Pagi")
    await pickSelect(page, "Jenis Bacaan", "Iqra")
    await dialog.getByRole("button", { name: "Tambah Santri" }).click()
    await expect(page.getByText(nama)).toBeVisible()
    // edit
    const card = page.locator("div.grid > div", { hasText: nama })
    await card.locator("button").nth(1).click()
    await page.getByRole("dialog").getByPlaceholder("Nama lengkap santri").fill(namaBaru)
    await page.getByRole("dialog").getByRole("button", { name: "Simpan Perubahan" }).click()
    await expect(page.getByText(namaBaru)).toBeVisible()
    // cleanup
    const card2 = page.locator("div.grid > div", { hasText: namaBaru })
    await card2.locator("button").last().click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
  })

  test("ADM-SANTRI-05 Tandai santri non-aktif", async ({ page }) => {
    const nama = uniq("Santri Nonaktif")
    await login(page, "admin")
    await page.goto("/admin/santri")
    await page.getByRole("button", { name: "Tambah Santri" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("Nama lengkap santri").fill(nama)
    await pickSelect(page, "Jenis Kelamin", "Laki-laki")
    await pickSelect(page, "Sesi", "Sore")
    await pickSelect(page, "Jenis Bacaan", "Iqra")
    await dialog.getByRole("button", { name: "Tambah Santri" }).click()
    await expect(page.getByText(nama)).toBeVisible()
    // edit -> toggle non-aktif
    const card = page.locator("div.grid > div", { hasText: nama })
    await card.locator("button").nth(1).click()
    const dlg = page.getByRole("dialog")
    await dlg.getByRole("button", { name: "Aktif", exact: true }).click()
    await dlg.getByRole("button", { name: "Simpan Perubahan" }).click()
    const card2 = page.locator("div.grid > div", { hasText: nama })
    await expect(card2.getByText("Non-aktif")).toBeVisible()
    // cleanup
    await card2.locator("button").last().click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
  })

  test("ADM-SANTRI-06 Detail santri", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/santri")
    await page.locator('button[title="Detail"]').first().click()
    await expect(page.getByRole("dialog").getByText("Detail Santri")).toBeVisible()
    await expect(page.getByText("Jenis Kelamin").last()).toBeVisible()
  })

  test("ADM-PENGAJAR-01 Daftar pengajar", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/pengajar")
    await expect(page.getByRole("button", { name: "Tambah Pengajar" })).toBeVisible()
  })

  test("ADM-PENGAJAR-02 Tambah pengajar", async ({ page }) => {
    const nama = uniq("Pengajar Uji")
    await login(page, "admin")
    await page.goto("/admin/pengajar")
    await page.getByRole("button", { name: "Tambah Pengajar" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("Nama lengkap pengajar").fill(nama)
    await pickSelect(page, "Jenis Kelamin", "Laki-laki")
    await dialog.getByPlaceholder("08xx-xxxx-xxxx").fill("081200000000")
    await dialog.getByRole("button", { name: "Tambah Pengajar" }).click()
    await expect(page.getByText(nama)).toBeVisible()
    // cleanup
    const card = page.locator("div.grid > div", { hasText: nama })
    await card.locator("button").last().click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
  })

  test("ADM-PENGAJAR-07 Kartu pengajar tampil kelompok + jumlah santri", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/pengajar")
    await expect(page.getByText(/\(\d+ santri\)/).first()).toBeVisible()
  })

  test("ADM-KEL-01 Daftar kelompok", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/kelompok")
    await expect(page.getByText(/Sesi (Pagi|Sore)/).first()).toBeVisible()
  })

  test("ADM-KEL-03 Validasi tambah kelompok tanpa sesi", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/kelompok")
    await page.getByRole("button", { name: "Kelompok", exact: true }).first().click()
    const dlg = page.getByRole("dialog")
    await dlg.getByRole("button", { name: "Tambah Kelompok" }).click()
    await expect(page.getByText("Pilih sesi")).toBeVisible()
  })

  test("ADM-JADWAL-01 Grid jadwal tampil", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/jadwal")
    await expect(page.getByText("Senin")).toBeVisible()
    await expect(page.getByText("Jumat")).toBeVisible()
  })

  test("ADM-AKUN-01 Daftar akun tampil", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/users")
    await expect(page.getByRole("button", { name: "Tambah Akun" })).toBeVisible()
  })

  test("ADM-AKUN-03 Validasi akun tanpa nama/password", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/users")
    await page.getByRole("button", { name: "Tambah Akun" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Tambah Akun" }).click()
    await expect(page.getByText(/wajib diisi/)).toBeVisible()
  })
})