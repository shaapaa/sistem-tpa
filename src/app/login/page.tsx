"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowRight, BookOpen } from "lucide-react"

const PHOTOS = [
  { src: "/image/TPA%20Baitul%20Yatama.webp", alt: "Kegiatan TPA Baitul Yatama", pos: "object-[50%_22%]", mobilePos: "max-lg:object-[50%_78%]" },
  { src: "/image/TPA.webp", alt: "Kegiatan belajar di TPA", pos: "object-center", mobilePos: "max-lg:object-[50%_72%]" },
  { src: "/image/TPA%20Ngaji.webp", alt: "Santri mengaji", pos: "object-[50%_30%]", mobilePos: "max-lg:object-[50%_70%]" },
]

function useSlideshow(interval = 4000) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % PHOTOS.length), interval)
    return () => clearInterval(t)
  }, [interval])
  return index
}

function Slideshow() {
  const index = useSlideshow()
  return (
    <>
      {PHOTOS.map((p, i) => (
        <img
          key={p.src}
          src={p.src}
          alt={p.alt}
          className={`absolute inset-0 h-full w-full object-cover ${p.pos} ${p.mobilePos} transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const index = useSlideshow()
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
      {/* Panel kiri: slideshow foto kegiatan TPA (desktop) */}
      <section className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Slideshow />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/80 to-sidebar/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar/70 via-transparent to-transparent" />

        <div className="relative flex items-center gap-3 px-12 py-12">
          <img src="/image/logo-tpa-transparent.png" alt="Logo TPA Baitul Yatama" className="h-10 w-auto object-contain" />
          <div>
            <p className="font-semibold text-[oklch(0.98_0.008_92)]">Baitul Yatama</p>
            <p className="text-xs text-[oklch(0.72_0.025_92)]">Sistem Monitoring</p>
          </div>
        </div>

        <div className="relative max-w-lg px-12">
          <p className="eyebrow text-[oklch(0.85_0.1_92)]!">Monitor Perkembangan Santri</p>
          <h1 className="mt-4 max-w-[11ch] text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-[oklch(0.98_0.008_92)]">Memantau perkembangan, mendampingi setiap langkah.</h1>
          <p className="mt-6 max-w-[45ch] text-sm leading-7 text-[oklch(0.75_0.02_92)]">Satu ruang terintegrasi untuk mencatat proses belajar, memantau kehadiran, dan melihat perkembangan santri secara berkelanjutan.</p>
          <div className="mt-8 flex items-center gap-3 text-sm text-[oklch(0.78_0.08_92)]"><BookOpen className="h-4 w-4" /> Data yang rapi untuk perhatian yang lebih baik.</div>
        </div>

        <div className="relative px-12 pb-12">
          <div className="flex items-center gap-2">
            {PHOTOS.map((p, i) => (
              <span key={p.src} title={p.alt} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-[oklch(0.98_0.008_92)]" : "w-1.5 bg-[oklch(0.58_0.025_92)]"}`} />
            ))}
          </div>
          <p className="mt-4 text-xs text-[oklch(0.58_0.025_92)]">TPA Baitul Yatama · Sistem Monitoring</p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/70 via-background to-background px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          {/* Logo paling atas (mobile) */}
          <div className="mb-7 flex flex-col items-center gap-1.5 lg:hidden">
            <img src="/image/logo-tpa-transparent.png" alt="Logo TPA Baitul Yatama" className="h-12 w-auto object-contain" />
            <p className="mt-1.5 font-semibold text-foreground">Baitul Yatama</p>
            <p className="text-xs text-muted-foreground">Sistem Monitoring Pendidikan</p>
          </div>

          {/* Slideshow foto kegiatan (mobile) */}
          <div className="relative mb-4 h-52 overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5 lg:hidden">
            <Slideshow />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-sidebar/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <BookOpen className="h-3.5 w-3.5" /> Kegiatan TPA Baitul Yatama
            </span>
          </div>
          <div className="mb-7 flex items-center justify-center gap-1.5 lg:hidden">
            {PHOTOS.map((p, i) => (
              <span key={p.src} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"}`} />
            ))}
          </div>

          <div className="mb-8 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <p className="eyebrow">Selamat datang kembali</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">Masuk ke Sistem Monitoring</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Gunakan akun yang sudah terdaftar untuk melanjutkan.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="email@contoh.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" autoComplete="new-password" /><button type="button" aria-label={showPassword ? "Sembunyikan password" : "Lihat password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              {error && <p className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm leading-5 text-destructive animate-slide-up" role="alert">{error}</p>}
              <Button type="submit" className="group h-11 w-full justify-between px-4" disabled={loading}>{loading ? "Masuk..." : <><span>Masuk</span><ArrowRight className="transition-transform group-hover:translate-x-1" /></>}</Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}