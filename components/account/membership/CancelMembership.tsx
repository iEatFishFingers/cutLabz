"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMembershipAction } from "@/app/account/membership/actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/account/bookings/ui";

/** End-of-period cancel with an inline confirm step. `endsOnLabel` is a pre-formatted date. */
export default function CancelMembership({ endsOnLabel }: { endsOnLabel: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = () => {
    setError(null);
    start(async () => {
      try {
        const res = await cancelMembershipAction();
        if (res.ok) {
          setConfirming(false);
          router.refresh();
        } else {
          setError(res.error);
        }
      } catch {
        setError("Something went wrong. Check your connection and try again.");
      }
    });
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      {!confirming ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className={BTN_SECONDARY}
        >
          Cancel membership
        </button>
      ) : (
        <div role="group" aria-label="Confirm cancelling your membership" className="space-y-4">
          <p className="text-sm text-white/70">
            Your membership stays active until {endsOnLabel}. You will not be able to book member
            cuts after that.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className={BTN_SECONDARY}
            >
              Keep membership
            </button>
            <button type="button" onClick={run} disabled={pending} aria-busy={pending || undefined} className={BTN_PRIMARY}>
              {pending ? "Cancelling…" : "Yes, cancel"}
            </button>
          </div>
        </div>
      )}
      <p aria-live="assertive" className="mt-3 text-sm text-red-400 empty:hidden">
        {error}
      </p>
    </div>
  );
}
