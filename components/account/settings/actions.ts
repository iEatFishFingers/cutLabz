"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteMyAccount } from "@/lib/customer/account";
import { requireCustomerAction } from "@/lib/customer/viewer";
import { LIMITS, validateDetails } from "@/lib/booking-shared";

export type SettingsState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "password" | "confirm", string>>;
};

type Text = { value: string; tooLong: boolean };
/** Non-string -> empty; over `max` -> tooLong (value is empty) so callers can say so. */
const text = (v: FormDataEntryValue | null, max: number): Text =>
  typeof v !== "string" ? { value: "", tooLong: false } : v.length > max ? { value: "", tooLong: true } : { value: v, tooLong: false };
const tooLong = (max: number) => `Too long (max ${max} characters).`;

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const n = text(formData.get("name"), 200);
  const p = text(formData.get("phone"), 100);
  const name = n.value.trim();
  const phone = p.value.trim();
  const d = validateDetails({ name, phone, email: "a@b.co", notes: "" });
  const fe: NonNullable<SettingsState["fieldErrors"]> = {};
  if (n.tooLong) fe.name = tooLong(LIMITS.name);
  else if (d.name) fe.name = d.name;
  // Phone is optional here (so a name change can be saved); if given it must be valid.
  if (p.tooLong) fe.phone = tooLong(LIMITS.phone);
  else if (phone && d.phone) fe.phone = d.phone;
  if (Object.keys(fe).length) return { fieldErrors: fe };

  let v;
  try {
    v = await requireCustomerAction();
  } catch {
    return { error: "Your session expired. Sign in again." };
  }
  const { error } = await v.db.auth.updateUser({ data: { full_name: name, phone } });
  if (error) return { error: "We couldn't save your details. Try again." };
  revalidatePath("/account", "layout");
  return { ok: true };
}

export async function changePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const pwT = text(formData.get("password"), 200);
  const pw = pwT.value;
  const confirm = text(formData.get("confirm"), 200).value;
  const fe: NonNullable<SettingsState["fieldErrors"]> = {};
  if (pwT.tooLong) fe.password = tooLong(72);
  else if (pw.length < 8) fe.password = "Use at least 8 characters.";
  else if (pw.length > 72) fe.password = tooLong(72);
  else if (pw !== confirm) fe.confirm = "Passwords don't match.";
  if (Object.keys(fe).length) return { fieldErrors: fe };

  let v;
  try {
    v = await requireCustomerAction();
  } catch {
    return { error: "Your session expired. Sign in again." };
  }
  const { error } = await v.db.auth.updateUser({ password: pw });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: "Choose a password you haven't used here." } };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: "Choose a stronger password." } };
    return { error: "We couldn't update your password. Try again." };
  }
  return { ok: true };
}

/**
 * Permanently deletes the signed-in customer's account. The user must type
 * their own email; bookings are kept anonymised (see lib/customer/account.ts).
 */
export async function deleteAccountAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  let v;
  try {
    v = await requireCustomerAction();
  } catch {
    return { error: "Your session expired. Sign in again." };
  }
  const typed = text(formData.get("confirmEmail"), 400).value.trim().toLowerCase();
  if (!typed || typed !== v.email.trim().toLowerCase()) {
    return { error: "Type your email address to confirm." };
  }
  const res = await deleteMyAccount({ userId: v.userId });
  if (!res.ok) return { error: res.error };
  // The user no longer exists: clear the session cookies locally (no API call).
  try {
    await v.db.auth.signOut({ scope: "local" });
  } catch {
    // The account is gone; a stale cookie is rejected by getUser() anyway.
  }
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}
