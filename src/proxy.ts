import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/admin", "/pengajar", "/orang-tua"];
const publicRoutes = ["/login", "/register"];

async function homeForRole(
  supabase: ReturnType<typeof createServerClient>,
  role: string | undefined,
  userId: string
) {
  if (role === "ADMIN") return "/admin";
  if (role === "PENGAJAR") return "/pengajar";
  if (role === "SANTRI") {
    const { count, error } = await supabase
      .from("santri")
      .select("id", { count: "exact", head: true })
      // RLS pada santri sudah membatasi hasil ke anak yang terhubung. Ini
      // menghindari ketergantungan pada policy SELECT tabel relasi wali_santri.

    return !error && (count ?? 0) > 0 ? "/orang-tua" : "/orang-tua/anak";
  }
  return null;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some((r) => path.startsWith(r));
  const isPublic = publicRoutes.some((r) => path.startsWith(r));

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Orang Tua uses the SANTRI database role. Pages that need child data stay
  // inaccessible until the account is linked to at least one santri.
  if (user && path.startsWith("/orang-tua") && path !== "/orang-tua/anak") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "SANTRI") {
      const home = await homeForRole(supabase, profile.role, user.id);
      if (home === "/orang-tua/anak") {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect authenticated users away from login/register according to their role.
  if (isPublic && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const home = await homeForRole(supabase, profile?.role, user.id);
    if (home) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
