import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "./env";

export { hasSupabaseEnv };

let client: SupabaseClient | undefined;

// Service-role client: bypasses RLS. Server-only; never expose to the browser.
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  if (!hasSupabaseEnv()) {
    throw new Error(
      "Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.",
    );
  }
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
