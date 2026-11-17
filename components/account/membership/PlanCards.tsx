"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinPlanAction } from "@/app/account/membership/actions";
import { formatGBP } from "@/lib/booking-shared";
import { MEMBERSHIP_PLANS } from "@/lib/membership";

const FOCUS =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2";

export default function PlanCards({ highlight }: { highlight: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const join = (id: string) => {
    setError(null);
    setBusy(id);
    start(async () => {
      try {
        const res = await joinPlanAction(id);
        if (res.ok) {
          router.replace("/account/membership?joined=1");
        } else if (res.code === "auth") {
          router.push("/login?next=/account/membership");
        } else if (res.code === "already_member") {
          setError(res.error);
          router.refresh();
        } else {
          setError(res.error);
        }
      } catch {
        setError("Something went wrong. Check your connection and try again.");
      } finally {
        setBusy(null);
      }
    });
  };

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {MEMBERSHIP_PLANS.map((p) => {
          const on = p.id === highlight;
          return (
            <div
              key={p.id}
              className={`p-6 md:p-8 border rounded-xl text-left ${
                on ? "border-white bg-white text-black" : "border-white/10 bg-[#111]"
              }`}
            >
              <h3 className="text-lg font-[500]">{p.name}</h3>
              <p className="text-2xl font-[500] mt-3">
                {formatGBP(p.priceGBP)}
                <span className={`text-sm ${on ? "text-black/60" : "text-white/50"}`}>/mo</span>
              </p>
              <ul
                className={`space-y-3 text-sm mb-6 mt-6 ${on ? "text-black/70" : "text-white/60"}`}
              >
                {p.perks.map((perk) => (
                  <li key={perk}>✓ {perk}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => join(p.id)}
                disabled={pending}
                aria-busy={busy === p.id || undefined}
                aria-label={`Join ${p.name}`}
                className={`block text-center w-full min-h-11 text-xs tracking-[0.2em] px-6 py-3 border transition disabled:opacity-40 disabled:pointer-events-none ${FOCUS} ${
                  on
                    ? "border-black hover:bg-black hover:text-white focus-visible:outline-black"
                    : "border-white/20 hover:bg-white hover:text-black focus-visible:outline-white"
                }`}
              >
                {busy === p.id ? "JOINING…" : "JOIN"}
              </button>
            </div>
          );
        })}
      </div>
      <div aria-live="assertive" className="empty:hidden">
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
