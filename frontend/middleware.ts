import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

// Sessão fica valendo indefinidamente (refresh automático do Supabase) enquanto
// o usuário voltar a acessar dentro desse intervalo; se passar disso sem
// nenhuma visita, forçamos logout e pedimos login (código) de novo.
const LAST_SEEN_COOKIE = "vm_last_seen";
const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (user) {
    const lastSeenRaw = request.cookies.get(LAST_SEEN_COOKIE)?.value;
    const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : null;
    const now = Date.now();
    const isStale = lastSeen !== null && !Number.isNaN(lastSeen) && now - lastSeen > INACTIVITY_LIMIT_MS;

    if (isStale) {
      await supabase.auth.signOut();

      if (!isPublic) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("auth_error", "inactivity_timeout");
        const redirect = NextResponse.redirect(url);
        response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
        redirect.cookies.delete(LAST_SEEN_COOKIE);
        return redirect;
      }

      response.cookies.delete(LAST_SEEN_COOKIE);
      return response;
    }

    response.cookies.set(LAST_SEEN_COOKIE, String(now), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: INACTIVITY_LIMIT_MS / 1000,
      path: "/",
    });
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
