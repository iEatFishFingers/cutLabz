import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Optimistic gates + session cookie refresh. NOT the security boundary:
// requireAdmin()/requireCustomer() authorize every page/action.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAccount = pathname === "/account" || pathname.startsWith("/account/");
  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (!hasSession) {
    if (isAdmin) {
      if (isLogin) return NextResponse.next();
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (isAccount) {
      const target = new URL("/login", request.url);
      target.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(target);
    }
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  let response = NextResponse.next({ request });
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  // Validates/refreshes the token (local verify when possible) and rewrites cookies.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/book", "/login", "/signup"],
};
