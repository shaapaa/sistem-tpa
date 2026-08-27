"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowRight, BookOpen } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role === "ADMIN") {
        router.push("/admin")
      } else if (profile?.role === "PENGAJAR") {
        router.push("/pengajar")
      } else {
        router.push("/orang-tua")
      }
    }
  }

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
      <section className="relative hidden overflow-hidden bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-sidebar-border" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full border border-sidebar-border/60" />
        <div className="relative flex items-center gap-3">
          <img src="/logo-mark.svg" alt="Logo TPA Baitul Yatama" className="h-10 w-10 rounded-md" />
          <div>
            <p className="font-semibold text-[oklch(0.98_0.008_92)]">Baitul Yatama</p>
            <p className="text-xs text-[oklch(0.72_0.025_92)]">Monitoring System</p>
          </div>
        </div>
        <div className="relative max-w-lg">
          <p className="eyebrow text-[oklch(0.78_0.08_92)]">Ruang tumbuh santri</p>
          <h1 className="mt-4 max-w-[11ch] text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-[oklch(0.98_0.008_92)]">Catatan kecil, perkembangan yang terlihat.</h1>
          <p className="mt-6 max-w-[45ch] text-sm leading-7 text-[oklch(0.75_0.02_92)]">Satu tempat untuk menjaga ritme belajar, kehadiran, dan komunikasi antara pengajar, pengelola, dan orang tua.</p>
          <div className="mt-8 flex items-center gap-3 text-sm text-[oklch(0.78_0.08_92)]"><BookOpen className="h-4 w-4" /> Data yang rapi untuk perhatian yang lebih baik.</div>
        </div>
        <p className="relative text-xs text-[oklch(0.58_0.025_92)]">TPA Baitul Yatama · Sistem Monitoring</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <img src="/logo-mark.svg" alt="Logo TPA Baitul Yatama" className="h-10 w-10 rounded-md" />
              <div><p className="font-semibold">Baitul Yatama</p><p className="text-xs text-muted-foreground">Monitoring System</p></div>
            </div>
          </div>
          <div className="mb-8">
            <p className="eyebrow">Selamat datang kembali</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">Masuk ke ruang kerja</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Gunakan akun yang sudah terdaftar untuk melanjutkan.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="email@contoh.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" autoComplete="current-password" /><button type="button" aria-label={showPassword ? "Sembunyikan password" : "Lihat password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            {error && <p className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm leading-5 text-destructive animate-slide-up" role="alert">{error}</p>}
            <Button type="submit" className="group h-11 w-full justify-between px-4" disabled={loading}>{loading ? "Masuk..." : <><span>Masuk</span><ArrowRight className="transition-transform group-hover:translate-x-1" /></>}</Button>
          </form>
        </div>
      </section>
    </main>
  )
}
