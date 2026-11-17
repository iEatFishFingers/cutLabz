"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "./actions";
import { Field, FormError } from "./Fields";
import { linkCls, primaryBtn } from "./styles";
import { LIMITS } from "@/lib/booking-shared";

export default function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const fe = state.fieldErrors ?? {};
  const q = next === "/account" ? "" : `?next=${encodeURIComponent(next)}`;

  if (state.sent) {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <p className="text-base">Check your email to confirm your account.</p>
        <p className="text-sm text-white/50">
          Open the link we sent, then sign in. It can take a minute to arrive.
        </p>
        <Link href={`/login${q}`} className={linkCls}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field id="name" name="name" text="Full name" autoComplete="name" maxLength={LIMITS.name} error={fe.name} />
      <Field id="phone" name="phone" text="Phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={LIMITS.phone} error={fe.phone} />
      <Field id="email" name="email" text="Email" type="email" inputMode="email" autoComplete="email" maxLength={LIMITS.email} error={fe.email} />
      <Field
        id="password"
        name="password"
        text="Password"
        type="password"
        autoComplete="new-password"
        maxLength={72}
        error={fe.password}
        hint="8 to 72 characters."
      />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Creating account" : "Create account"}
      </button>
      <Link href={`/login${q}`} className={linkCls}>
        Already have an account? Sign in
      </Link>
    </form>
  );
}
