"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resumeMembershipAction } from "@/app/account/membership/actions";
import { BTN_SECONDARY } from "@/components/account/bookings/ui";

/** Undoes a pending membership cancellation while it is still active. */
export default function ResumeMembership() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = () => {
    setError(null);
    start(async () => {
      try {
        const res = await resumeMembershipAction();
        if (res.ok) router.refresh();
        else setError(res.error);
      } catch {
        setError("Something went wrong. Check your connection and try again.");
      }
    });
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        aria-busy={pending || undefined}
        className={BTN_SECONDARY}
      >
        {pending ? "Keeping…" : "Keep my membership"}
      </button>
      <p aria-live="assertive" className="mt-3 text-sm text-red-400 empty:hidden">
        {error}
      </p>
    </div>
  );
}
