"use client";

import { useEffect } from "react";
import ContactLinks from "@/components/account/ContactLinks";

const MESSAGES: Record<string, { text: string; ok: boolean; contact?: boolean }> = {
  cancelled: { text: "Appointment cancelled.", ok: true },
  rescheduled: { text: "Appointment moved. See you then.", ok: true },
  too_late: {
    text: "That appointment starts within 24 hours, so it can't be changed online. Phone or email the shop:",
    ok: false,
    contact: true,
  },
  not_found: { text: "We couldn't find that appointment.", ok: false },
  not_active: { text: "That appointment can no longer be changed.", ok: false },
};

/** One-time message from the query string; the param is removed after it shows. */
export default function FlashNote({ kind }: { kind: string | null }) {
  useEffect(() => {
    if (!kind) return;
    try {
      window.history.replaceState(window.history.state, "", "/account");
    } catch {
      // ignore: the note just stays in the URL
    }
  }, [kind]);

  const m = kind ? MESSAGES[kind] : undefined;
  return (
    <div role={m && !m.ok ? "alert" : "status"} aria-live="polite">
      {m && (
        <p className={`mb-6 text-sm ${m.ok ? "text-green-400" : "text-red-400"}`}>
          {m.text}
          {m.contact && (
            <>
              {" "}
              <ContactLinks />
            </>
          )}
        </p>
      )}
    </div>
  );
}
