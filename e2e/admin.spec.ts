import { test, expect, login, pickSelect, uniq } from "./helpers"

const ADMIN = process.env.E2E_ADMIN_EMAIL || "admin@tpa-baitulyatama.local"
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD || "admin123"

async function fillSantriForm(page: import("@playwright/test").Page, nama: string, sesi = "Pagi", bacaan = "Iqra") {
  const dialog = page.getByRole("dialog")
  await dialog.getByPlaceholder("Nama lengkap santri").fill(nama)
  await pickSelect(page, "Jenis Kelamin", "Laki-laki")
  await pickSelect(page, "Sesi", sesi)
  await pickSelect(page, "Jenis Bacaan", bacaan)
  await dialog.getByRole("button", { name: "Tambah Santri" }).click()
  await expect(page.getByText(nama)).toBeVisible()
}

async function deleteRow(page: import("@playwright/test").Page, nama: string) {
  const card = page.locator("div.grid > div", { hasText: nama }).last()
  await card.locator("button").last().click()
  await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
}

test.describe("Admin", () => {
  test("ADM-LOGIN-01 Login admin valid", async ({ page }) => {
    await login(page, "admin")
    await expect(page).toHaveURL(/\/admin/)
  })

  test("ADM-LOGIN-02 Login admin password salah", async ({ page }) => {
    await page.goto("/login")
    await page.locator("#email").fill(ADMIN)
    await page.locator("#password").fill("salah-password-xyz")
    await page.getByRole("button", { name: "Masuk" }).click()
    await expect(page.getByRole("alert")).toBeVisible()
  })

  test("ADM-DASH-01 Dashboard admin menampilkan ringkasan", async ({ page }) => {
    await login(page, "admin")
    await expect(page.getByText("Santri Aktif")).toBeVisible()
    await expect(page.getByText("Pengajar Aktif")).toBeVisible()
    await expect(page.getByText("Aktivitas bulan ini")).toBeVisible()
  })

  test("ADM-SANTRI-01 Daftar santri ditampilkan", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/santri")
    await expect(page.getByRole("button", { name: "Tambah Santri" })).toBeVisible()
    await expect(page.locator("div.grid > div").first()).toBeVisible()
  })

  test("ADM-SANTRI-02 Tambah santri", async ({ page }) => {
    const nama = uniq("Santri Uji")
    await login(page, "admin")
    await page.goto("/admin/santri")
    await page.getByRole("button", { name: "Tambah Santri" }).click()
    await fillSantriForm(page, nama)
    await expect(page.getByText(nama)).toBeVisible()
    await deleteRow(page, nama)
    await expect(page.getByText(nama)).toHaveCount(0)
  })

  test("ADM-SANTRI-03 Edit santri", async ({ page }) => {
    const nama = uniq("Santri Edit")
    const namaBaru = `${nama} X`
    await login(page, "admin")
    await page.goto("/admin/santri")
    await page.getByRole("button", { name: "Tambah Santri" }).click()
    await fillSantriForm(page, nama)
    const card = page.locator("div.grid > div", { hasText: nama })
    await card.locator("button").nth(1).click()
    await page.getByRole("dialog").getByPlaceholder("Nama lengkap santri").fill(namaBaru)
    await page.getByRole("dialog").getByRole("button", { name: "Simpan Perubahan" }).click()
    await expect(page.getByText(namaBaru)).toBeVisible()
    await deleteRow(page, namaBaru)
  })

  test("ADM-SANTRI-04 Hapus santri", async ({ page }) => {
    const nama = uniq("Santri Hapus")
    await login(page, "admin")
    await page.goto("/admin/santri")
    await page.getByRole("button", { name: "Tambah Santri" }).click()
    await fillSantriForm(page, nama)
    await deleteRow(page, nama)
    await expect(page.getByText(nama)).toHaveCount(0)
  })

  test("ADM-SANTRI-05 Tandai santri non-aktif", async ({ page }) => {
    const nama = uniq("Santri Nonaktif")
    await login(page, "admin")
    await page.goto("/admin/santri")
    await page.getByRole("button", { name: "Tambah Santri" }).click()
    await fillSantriForm(page, nama)
    const card = page.locator("div.grid > div", { hasText: nama })
    await card.locator("button").nth(1).click()
    const dlg = page.getByRole("dialog")
    await dlg.getByRole("button", { name: "Aktif", exact: true }).click()
    await dlg.getByRole("button", { name: "Simpan Perubahan" }).click()
    const card2 = page.locator("div.grid > div", { hasText: nama })
    await expect(card2.getByText("Non-aktif")).toBeVisible()
    await card2.locator("button").last().click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
  })

  test("ADM-SANTRI-06 Detail santri", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/santri")
    await page.locator('button[title="Detail"]').first().click()
    await expect(page.getByRole("dialog").getByText("Detail Santri")).toBeVisible()
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
    await deleteRow(page, nama)
    await expect(page.getByText(nama)).toHaveCount(0)
  })

  test("ADM-PENGAJAR-03 Edit pengajar", async ({ page }) => {
    const nama = uniq("Pengajar Edit")
    const namaBaru = `${nama} X`
    await login(page, "admin")
    await page.goto("/admin/pengajar")
    await page.getByRole("button", { name: "Tambah Pengajar" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("Nama lengkap pengajar").fill(nama)
    await pickSelect(page, "Jenis Kelamin", "Perempuan")
    await dialog.getByRole("button", { name: "Tambah Pengajar" }).click()
    await expect(page.getByText(nama)).toBeVisible()
    const card = page.locator("div.grid > div", { hasText: nama })
    await card.locator("button").nth(0).click()
    await page.getByRole("dialog").getByPlaceholder("Nama lengkap pengajar").fill(namaBaru)
    await page.getByRole("dialog").getByRole("button", { name: "Simpan Perubahan" }).click()
    await expect(page.getByText(namaBaru)).toBeVisible()
    await deleteRow(page, namaBaru)
  })

  test("ADM-PENGAJAR-04 Hapus pengajar", async ({ page }) => {
    const nama = uniq("Pengajar Hapus")
    await login(page, "admin")
    await page.goto("/admin/pengajar")
    await page.getByRole("button", { name: "Tambah Pengajar" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("Nama lengkap pengajar").fill(nama)
    await pickSelect(page, "Jenis Kelamin", "Laki-laki")
    await dialog.getByRole("button", { name: "Tambah Pengajar" }).click()
    await expect(page.getByText(nama)).toBeVisible()
    await deleteRow(page, nama)
    await expect(page.getByText(nama)).toHaveCount(0)
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

  test("ADM-KEL-03 Menolak kelompok duplikat pada sesi yang sama", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/kelompok")
    await page.getByRole("button", { name: "Kelompok", exact: true }).first().click()
    const dlg = page.getByRole("dialog")
    await dlg.getByRole("button", { name: "Tambah Kelompok" }).click()
    await expect(page.getByText(/sudah ada pada sesi/)).toBeVisible()
  })

  test("ADM-KEL-04 Edit kelompok", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/kelompok")
    const firstCard = page.locator("section.surface-panel").first().locator("div.card-elevated").first()
    await firstCard.locator("button").nth(0).click()
    const dlg = page.getByRole("dialog")
    await dlg.getByRole("button", { name: "Simpan Perubahan" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("ADM-JADWAL-01 Grid jadwal tampil", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/jadwal")
    await expect(page.getByText(/Senin/i)).toBeVisible()
    await expect(page.getByText(/Jumat/i)).toBeVisible()
  })

  test("ADM-JADWAL-03 Validasi jadwal tanpa kelompok/hari", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/jadwal")
    await page.getByRole("button", { name: "Tambah Jadwal" }).click()
    const dlg = page.getByRole("dialog")
    await dlg.getByRole("button", { name: "Tambah Jadwal" }).click()
    await expect(page.getByText("Kelompok dan hari wajib diisi")).toBeVisible()
  })

  test("ADM-JADWAL-04 Edit jadwal", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/jadwal")
    const timeEl = page.locator("div.space-y-3 div.font-tabular").first()
    const card = timeEl.locator("xpath=ancestor::div[contains(@class,'cursor-pointer')]").first()
    const orig = (await timeEl.innerText()).split(" - ")[0].trim()
    const baru = orig === "07:30" ? "08:00" : "07:30"
    await card.click()
    await page.getByRole("dialog").locator('input[type="time"]').nth(0).fill(baru)
    await page.getByRole("dialog").getByRole("button", { name: "Simpan Perubahan" }).click()
    await expect(page.locator("div.space-y-3 div.font-tabular").filter({ hasText: baru }).first()).toBeVisible()
    // restore
    const card2 = page.locator("div.space-y-3 div.font-tabular").filter({ hasText: baru }).first().locator("xpath=ancestor::div[contains(@class,'cursor-pointer')]").first()
    await card2.click()
    await page.getByRole("dialog").locator('input[type="time"]').nth(0).fill(orig)
    await page.getByRole("dialog").getByRole("button", { name: "Simpan Perubahan" }).click()
  })

  test("ADM-JADWAL-05 Hapus jadwal lalu tambah kembali (restore)", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/jadwal")
    const timeEl = page.locator("div.space-y-3 div.font-tabular").first()
    const card = timeEl.locator("xpath=ancestor::div[contains(@class,'cursor-pointer')]").first()
    const kelompokLabel = (await card.innerText()).split("\n")[0].trim()
    const dayName = (await timeEl.locator("xpath=ancestor::div[contains(@class,'space-y-3')]").first().locator("h3").innerText()).trim()
    const dayLabel = dayName.toLowerCase().replace(/^./, (c) => c.toUpperCase())
    const dayCol = page.locator("div.space-y-3").filter({ has: page.getByRole("heading", { name: dayLabel }) }).first()
    // hapus
    await card.locator("button").click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
    await expect(dayCol.getByText(kelompokLabel)).toHaveCount(0)
    // tambah kembali (restore)
    await page.getByRole("button", { name: "Tambah Jadwal" }).click()
    const dlg = page.getByRole("dialog")
    await pickSelect(page, "Kelompok", kelompokLabel)
    await pickSelect(page, "Hari", dayLabel)
    await dlg.getByRole("button", { name: "Tambah Jadwal" }).click()
    await expect(dayCol.getByText(kelompokLabel)).toBeVisible()
  })

  test("ADM-AKUN-01 Daftar akun tampil", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/users")
    await expect(page.getByRole("button", { name: "Tambah Akun" })).toBeVisible()
  })

  test("ADM-AKUN-02 Tambah akun (role Admin)", async ({ page }) => {
    const nama = uniq("Akun Uji")
    await login(page, "admin")
    await page.goto("/admin/users")
    await page.getByRole("button", { name: "Tambah Akun" }).click()
    const dlg = page.getByRole("dialog")
    await dlg.getByPlaceholder("Nama akun").fill(nama)
    await pickSelect(page, "Role", "Admin")
    await dlg.getByPlaceholder("Password").fill("test1234")
    await dlg.getByRole("button", { name: "Tambah Akun" }).click()
    await expect(page.getByText(nama)).toBeVisible()
    // cleanup: hapus akun
    const row = page.locator("tr", { hasText: nama })
    await row.getByRole("button").nth(1).click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
    await expect(page.getByText(nama)).toHaveCount(0)
  })

  test("ADM-AKUN-03 Validasi akun tanpa nama/password", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/admin/users")
    await page.getByRole("button", { name: "Tambah Akun" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Tambah Akun" }).click()
    await expect(page.getByText(/wajib diisi/)).toBeVisible()
  })

  test("ADM-AKUN-04 Edit akun (ubah role)", async ({ page }) => {
    const nama = uniq("Akun Edit")
    await login(page, "admin")
    await page.goto("/admin/users")
    await page.getByRole("button", { name: "Tambah Akun" }).click()
    const dlg = page.getByRole("dialog")
    await dlg.getByPlaceholder("Nama akun").fill(nama)
    await pickSelect(page, "Role", "Admin")
    await dlg.getByPlaceholder("Password").fill("test1234")
    await dlg.getByRole("button", { name: "Tambah Akun" }).click()
    await expect(page.getByText(nama)).toBeVisible()
    const row = page.locator("tr", { hasText: nama })
    await row.getByRole("button").nth(0).click()
    await pickSelect(page, "Role", "Santri")
    await page.getByRole("dialog").getByRole("button", { name: "Simpan Perubahan" }).click()
    const row2 = page.locator("tr", { hasText: nama })
    await expect(row2.getByText("santri")).toBeVisible()
    await row2.getByRole("button").nth(1).click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
    await expect(page.getByText(nama)).toHaveCount(0)
  })

  test("ADM-AKUN-05 Hapus akun", async ({ page }) => {
    const nama = uniq("Akun Hapus")
    await login(page, "admin")
    await page.goto("/admin/users")
    await page.getByRole("button", { name: "Tambah Akun" }).click()
    const dlg = page.getByRole("dialog")
    await dlg.getByPlaceholder("Nama akun").fill(nama)
    await pickSelect(page, "Role", "Admin")
    await dlg.getByPlaceholder("Password").fill("test1234")
    await dlg.getByRole("button", { name: "Tambah Akun" }).click()
    await expect(page.getByText(nama)).toBeVisible()
    const row = page.locator("tr", { hasText: nama })
    await row.getByRole("button").nth(1).click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
    await expect(page.getByText(nama)).toHaveCount(0)
  })

  test("ADM-LOGOUT-01 Logout berhasil dan session hilang", async ({ page }) => {
    await login(page, "admin")
    await page.getByRole("button", { name: "Keluar" }).click()
    await expect(page).toHaveURL(/login/)
    await page.goto("/admin")
    await expect(page).toHaveURL(/login/)
  })

  test("ADM-AUTH-01 Akses /admin tanpa login diarahkan ke login", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/login/)
  })

  test("ADM-AUTH-02 Admin tidak bisa akses halaman pengajar/orang tua", async ({ page }) => {
    await login(page, "admin")
    await page.goto("/pengajar")
    await expect(page).not.toHaveURL(/pengajar/, { timeout: 10_000 })
    await page.goto("/orang-tua")
    await expect(page).not.toHaveURL(/orang-tua/, { timeout: 10_000 })
  })
})