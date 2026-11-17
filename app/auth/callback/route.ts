import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/customer/viewer";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const fail = () => NextResponse.redirect(new URL("/login?error=link", origin));
  if (!code || code.length > 2000) return fail();
  try {
    const db = await createSupabaseServerClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) return fail();
  } catch {
    return fail();
  }
  return NextResponse.redirect(new URL(next, origin));
}
