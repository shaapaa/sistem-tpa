import { Page, expect, test } from "@playwright/test"

export const CREDS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || "admin@tpa-baitulyatama.local",
    password: process.env.E2E_ADMIN_PASSWORD || "admin123",
    home: "/admin",
  },
  pengajar: {
    email: process.env.E2E_PENGAJAR_EMAIL || "bu-fatimah@tpa-baitulyatama.local",
    password: process.env.E2E_PENGAJAR_PASSWORD || "pengajar123",
    home: "/pengajar",
  },
  orangtua: {
    email: process.env.E2E_ORANGTUA_EMAIL || "harisya@tpa-baitulyatama.local",
    password: process.env.E2E_ORANGTUA_PASSWORD || "harisya123",
    home: "/orang-tua",
  },
}

export type Role = keyof typeof CREDS

export async function login(page: Page, role: Role) {
  const c = CREDS[role]
  await page.goto("/login")
  await page.getByLabel("Email").fill(c.email)
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(c.password)
  await page.getByRole("button", { name: "Masuk" }).click()
  await page.waitForURL((u) => u.pathname === c.home, { timeout: 30_000 })
}

/** Pilih opsi pada komponen Select (Base UI) berdasarkan label field. */
export async function pickSelect(page: Page, labelText: string, optionLabel: string) {
  const field = page.locator(`div:has(> label:text-is("${labelText}"))`).last()
  await field.getByRole("combobox").click()
  await page.getByRole("option", { name: optionLabel, exact: false }).click()
}

/** Klik tombol konfirmasi (ConfirmDialog) dengan label tertentu. */
export async function confirmDialog(page: Page, label = "Hapus") {
  await page.getByRole("button", { name: label, exact: true }).last().click()
}

export function uniq(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`
}

export { expect, test }
