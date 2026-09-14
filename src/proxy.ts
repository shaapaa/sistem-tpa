import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/admin", "/pengajar", "/orang-tua"];
const publicRoutes = ["/login"];

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

  // Role user dari profil (untuk redirect sesuai peran)
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const role = profile?.role as "ADMIN" | "PENGAJAR" | "SANTRI" | undefined;
  const roleHome: Record<string, string> = { ADMIN: "/admin", PENGAJAR: "/pengajar", SANTRI: "/orang-tua" };
  const home = role ? roleHome[role] ?? "/login" : "/login";
  const routeRole = path.startsWith("/admin") ? "ADMIN" : path.startsWith("/pengajar") ? "PENGAJAR" : "SANTRI";

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from public routes ke home sesuai role
  if (isPublic && user) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Redirect user yang salah role dari rute terproteksi ke home sesuai role
  if (isProtected && user && role && role !== routeRole) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
