"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const GENERIC = "Incorrect email or password.";

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    email.length > 254 ||
    password.length > 200
  ) {
    return { error: GENERIC };
  }

  const db = await createSupabaseServerClient();
  const { data, error } = await db.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.user) return { error: GENERIC };

  const { data: row, error: adminErr } = await db
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (adminErr || !row) {
    // They just authenticated here; sign out and don't reveal that the account exists.
    await db.auth.signOut();
    return { error: GENERIC };
  }
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const db = await createSupabaseServerClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
