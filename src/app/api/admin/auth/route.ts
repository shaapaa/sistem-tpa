import { NextRequest, NextResponse } from "next/server"
import { createClient as createAnonServerClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function service() {
  return createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function isAdmin() {
  const supabase = await createAnonServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  return data?.role === "ADMIN"
}

function authError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("already been registered") || lower.includes("already registered") || lower.includes("duplicate")) {
    return "Username / email sudah digunakan"
  }
  if (lower.includes("invalid") && lower.includes("password")) {
    return "Password tidak valid (minimal 6 karakter)"
  }
  if (lower.includes("not allowed") || lower.includes("forbidden") || lower.includes("unauthorized")) {
    return "Operasi tidak diizinkan"
  }
  return message
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: "Tidak diizinkan" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const action = body?.action as string | undefined

  if (action === "create") {
    if (!body.email || !body.password) {
      return NextResponse.json({ message: "Email dan password wajib diisi" }, { status: 400 })
    }
    const { data, error } = await service().auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    })
    if (error) return NextResponse.json({ message: authError(error.message) }, { status: 400 })
    return NextResponse.json({ id: data.user.id })
  }

  if (action === "update") {
    if (!body.id) {
      return NextResponse.json({ message: "ID wajib diisi" }, { status: 400 })
    }
    const attributes: Record<string, string | boolean> = {}
    if (body.password) attributes.password = body.password
    if (body.email) {
      attributes.email = body.email
      attributes.email_confirm = true
    }
    if (Object.keys(attributes).length === 0) {
      return NextResponse.json({})
    }
    const { error } = await service().auth.admin.updateUserById(body.id, attributes)
    if (error) return NextResponse.json({ message: authError(error.message) }, { status: 400 })
    return NextResponse.json({})
  }

  return NextResponse.json({ message: "Aksi tidak dikenal" }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: "Tidak diizinkan" }, { status: 403 })
  }

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ message: "ID wajib diisi" }, { status: 400 })
  }
  const { error } = await service().auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ message: authError(error.message) }, { status: 400 })
  return NextResponse.json({})
}
