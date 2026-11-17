"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "./actions";
import { Field, FormError } from "./Fields";
import { linkCls, primaryBtn } from "./styles";

export default function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {
    error: initialError,
  });
  const q = next === "/account" ? "" : `?next=${encodeURIComponent(next)}`;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field id="email" name="email" text="Email" type="email" autoComplete="username" maxLength={254} inputMode="email" />
      <Field id="password" name="password" text="Password" type="password" autoComplete="current-password" maxLength={200} />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Signing in" : "Sign in"}
      </button>
      <div className="flex flex-col">
        <Link href={`/signup${q}`} className={linkCls}>
          New here? Create an account
        </Link>
        <Link href="/forgot-password" className={linkCls}>
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
