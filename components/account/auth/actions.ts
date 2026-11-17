"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/customer/viewer";
import { LIMITS, validateDetails } from "@/lib/booking-shared";
import { requestOrigin } from "./origin";

export type AuthState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "password", string>>;
  /** Set when the visitor should check their inbox. */
  sent?: boolean;
};

const str = (v: FormDataEntryValue | null, max: number): string | null =>
  typeof v === "string" && v.length <= max ? v : null;

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = str(formData.get("name"), 200)?.trim() ?? "";
  const phone = str(formData.get("phone"), 100)?.trim() ?? "";
  const email = str(formData.get("email"), 400)?.trim() ?? "";
  const password = str(formData.get("password"), 200) ?? "";
  const next = safeNext(formData.get("next"));

  const fe: NonNullable<AuthState["fieldErrors"]> = {};
  const d = validateDetails({ name, phone, email, notes: "" });
  if (d.name) fe.name = d.name;
  if (d.phone) fe.phone = d.phone;
  if (d.email) fe.email = d.email;
  if (password.length < 8) fe.password = "Use at least 8 characters.";
  else if (password.length > 72) fe.password = "Max 72 characters.";
  if (Object.keys(fe).length) return { fieldErrors: fe };

  const db = await createSupabaseServerClient();
  const origin = await requestOrigin();
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, phone },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    // Same screen as success so registered emails are not revealed.
    if (error.code === "user_already_exists") return { sent: true };
    if (error.code === "weak_password") {
      return { fieldErrors: { password: "Choose a stronger password." } };
    }
    return { error: "We couldn't create your account. Try again in a moment." };
  }
  if (data.session) redirect(next);
  return { sent: true };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = str(formData.get("email"), LIMITS.email)?.trim();
  const password = str(formData.get("password"), 200);
  const next = safeNext(formData.get("next"));
  const generic = "Incorrect email or password.";
  if (!email || !password) return { error: generic };

  const db = await createSupabaseServerClient();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return { error: "Confirm your email first." };
    return { error: generic };
  }
  redirect(next);
}

export async function requestReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = str(formData.get("email"), LIMITS.email)?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { fieldErrors: { email: "Enter a valid email." } };
  }
  const db = await createSupabaseServerClient();
  const origin = await requestOrigin();
  // Result ignored on purpose: the response never reveals whether the email exists.
  await db.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/account/settings?reset=1")}`,
  });
  return { sent: true };
}

export async function signOut(): Promise<void> {
  const db = await createSupabaseServerClient();
  await db.auth.signOut();
  redirect("/");
}
