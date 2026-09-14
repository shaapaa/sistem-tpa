import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Menghapus data bekas testing (nama ber-prefix test) setelah seluruh run selesai.
// Dijalankan oleh Playwright globalTeardown, baik test lulus maupun gagal.
export default async function globalTeardown() {
  const envPath = path.join(process.cwd(), ".env.local")
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if ((!url || !key) && fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, "utf8")
    const get = (k: string) => env.split("\n").find((l) => l.startsWith(k + "="))?.split("=").slice(1).join("=")
    url = url || get("NEXT_PUBLIC_SUPABASE_URL")
    key = key || get("SUPABASE_SERVICE_ROLE_KEY")
  }
  if (!url || !key) return

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const prefixes = [
    "santri uji-", "santri edit-", "santri hapus-", "santri nonaktif-",
    "pengajar uji-", "pengajar edit-", "pengajar hapus-",
    "akun uji-", "akun edit-", "akun hapus-", "qa ",
  ]
  const hit = (n?: string) => !!n && prefixes.some((p) => n.toLowerCase().startsWith(p))

  const [sa, pj, pr] = await Promise.all([
    sb.from("santri").select("id,nama"),
    sb.from("pengajar").select("id,nama"),
    sb.from("profiles").select("id,nama,role"),
  ])
  const sIds = (sa.data || []).filter((r) => hit(r.nama)).map((r) => r.id)
  const pjIds = (pj.data || []).filter((r) => hit(r.nama)).map((r) => r.id)
  const prIds = (pr.data || []).filter((r) => hit(r.nama)).map((r) => r.id)

  if (sIds.length) await sb.from("santri").delete().in("id", sIds)
  if (pjIds.length) await sb.from("pengajar").delete().in("id", pjIds)
  if (prIds.length) await sb.from("profiles").delete().in("id", prIds)
}