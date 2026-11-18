"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBookingAction } from "@/app/account/bookings/actions";
import ConfirmDialog from "./ConfirmDialog";
import { BTN_SECONDARY } from "./ui";

export default function CancelButton({ bookingId, summary }: { bookingId: string; summary: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const confirm = () => {
    setError(null);
    start(async () => {
      try {
        const res = await cancelBookingAction(bookingId);
        if (res.ok) {
          setOpen(false);
          router.replace("/account?cancelled=1");
        } else if (res.code === "error") {
          // Close the dialog; the banner below stays visible.
          setOpen(false);
          setError(res.error);
        } else if (res.code === "auth") {
          router.push("/login?next=/account");
        } else {
          // too_late / not_found / not_active: the list now tells the truth.
          router.replace(`/account?notice=${res.code}`);
        }
      } catch {
        setOpen(false);
        setError("Something went wrong. Check your connection and try again.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className={BTN_SECONDARY}
      >
        Cancel
      </button>
      {!open && error && (
        <p role="alert" className="basis-full text-sm text-red-400">
          {error}
        </p>
      )}
      {open && (
        <ConfirmDialog
          title="Cancel this appointment?"
          confirmLabel="Yes, cancel it"
          cancelLabel="Keep it"
          pending={pending}
          error={error}
          onConfirm={confirm}
          onClose={() => {
            setOpen(false);
            setError(null);
          }}
        >
          <p className="text-white/80">{summary}</p>
          <p>This can&apos;t be undone. You can book another time afterwards.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
