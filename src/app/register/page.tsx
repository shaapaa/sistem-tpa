"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function registrationError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("already registered") || lower.includes("already been registered") || lower.includes("user already exists")) {
    return "Email tersebut sudah terdaftar."
  }
  return message
}

export default function RegisterPage() {
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return

    const normalizedNama = nama.trim()
    const normalizedEmail = email.trim().toLowerCase()
    setError(null)
    setSuccess(null)

    if (!normalizedNama) {
      setError("Nama lengkap wajib diisi.")
      return
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Email tidak valid.")
      return
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.")
      return
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sesuai.")
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    })
    if (signUpError) {
      setError(registrationError(signUpError.message))
      setLoading(false)
      return
    }
    if (!data.user || data.user.identities?.length === 0) {
      setError("Email tersebut sudah terdaftar.")
      setLoading(false)
      return
    }
    if (!data.session) {
      setError("Sesi registrasi tidak tersedia. Silakan coba lagi.")
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.rpc("register_santri_profile", {
      p_nama: normalizedNama,
    })
    if (profileError) {
      await supabase.auth.signOut()
      setError(registrationError(profileError.message))
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setSuccess("Registrasi berhasil. Silakan login dengan akun yang baru dibuat.")
    setLoading(false)
    window.setTimeout(() => router.replace("/login"), 1200)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/70 via-background to-background px-5 py-10 sm:px-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-1.5">
          <img src="/image/logo-tpa-transparent.png" alt="Logo TPA Baitul Yatama" className="h-12 w-auto object-contain" />
          <p className="mt-1.5 font-semibold text-foreground">Baitul Yatama</p>
          <p className="text-xs text-muted-foreground">Sistem Monitoring Pendidikan</p>
        </div>

        <section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <p className="eyebrow">Registrasi orang tua</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">Buat akun Anda</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Daftar untuk memantau perkembangan anak di TPA Baitul Yatama.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <Input id="nama" value={nama} onChange={(event) => setNama(event.target.value)} placeholder="Nama lengkap" required autoComplete="name" disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@contoh.com" required autoComplete="email" disabled={loading} />
            </div>
            <PasswordField id="password" label="Password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} disabled={loading} autoComplete="new-password" />
            <PasswordField id="confirm-password" label="Konfirmasi Password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} disabled={loading} autoComplete="new-password" />
            {error && <p className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm leading-5 text-destructive" role="alert">{error}</p>}
            {success && <p className="border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm leading-5 text-emerald-800" role="status">{success}</p>}
            <Button type="submit" className="group relative h-11 w-full justify-center px-12" disabled={loading}>
              {loading ? "Mendaftarkan..." : <><span>Daftar</span><ArrowRight className="absolute right-4 h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Sudah punya akun? <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Masuk ke sistem</Link>
          </p>
        </section>
      </div>
    </main>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggle: () => void
  disabled: boolean
  autoComplete: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Minimal 8 karakter" required minLength={8} className="pr-10" autoComplete={autoComplete} disabled={disabled} />
        <button type="button" aria-label={visible ? "Sembunyikan password" : "Lihat password"} onClick={onToggle} disabled={disabled} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
