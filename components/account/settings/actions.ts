"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerAction } from "@/lib/customer/viewer";
import { validateDetails } from "@/lib/booking-shared";

export type SettingsState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "password" | "confirm", string>>;
};

const text = (v: FormDataEntryValue | null, max: number): string =>
  typeof v === "string" && v.length <= max ? v : "";

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const name = text(formData.get("name"), 200).trim();
  const phone = text(formData.get("phone"), 100).trim();
  const d = validateDetails({ name, phone, email: "a@b.co", notes: "" });
  const fe: NonNullable<SettingsState["fieldErrors"]> = {};
  if (d.name) fe.name = d.name;
  if (d.phone) fe.phone = d.phone;
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
  const pw = text(formData.get("password"), 200);
  const confirm = text(formData.get("confirm"), 200);
  const fe: NonNullable<SettingsState["fieldErrors"]> = {};
  if (pw.length < 8) fe.password = "Use at least 8 characters.";
  else if (pw.length > 72) fe.password = "Max 72 characters.";
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
