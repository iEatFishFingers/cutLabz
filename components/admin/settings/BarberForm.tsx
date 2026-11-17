"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveBarber } from "@/app/admin/(panel)/barbers/actions";
import { LIMITS, type ActionResult } from "@/lib/admin/catalog-admin";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, FieldError, INPUT, LABEL, ResultMessage } from "./ui";

export type BarberValues = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  hasHours: boolean;
  futureBookings: number | null;
};

export default function BarberForm({ initial }: { initial: BarberValues | null }) {
  const isNew = initial === null;
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const r = await saveBarber(prev, fd);
      if (r.ok && isNew) {
        setFormKey((k) => k + 1);
        setOpen(false);
      }
      return r;
    },
    null,
  );
  const uid = `barber-${initial?.id ?? "new"}`;

  if (isNew && !open) {
    return (
      <div>
        <button type="button" className={BTN_SECONDARY} onClick={() => setOpen(true)}>
          Add barber
        </button>
        <ResultMessage result={result?.ok ? result : null} />
      </div>
    );
  }

  return (
    <form key={formKey} action={action} className={CARD}>
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className={LABEL}>
            Name
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            required
            maxLength={LIMITS.barberName}
            defaultValue={initial?.name ?? ""}
            className={INPUT}
          />
          <FieldError result={result} name="name" />
        </div>
        <div>
          <label htmlFor={`${uid}-role`} className={LABEL}>
            Role
          </label>
          <input
            id={`${uid}-role`}
            name="role"
            maxLength={LIMITS.barberRole}
            defaultValue={initial?.role ?? ""}
            className={INPUT}
          />
          <FieldError result={result} name="role" />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial?.active ?? true}
            className="h-4 w-4 accent-white"
          />
          Active
        </label>
      </div>

      {initial && !initial.hasHours ? (
        <p className="mt-4 text-xs text-white/50">
          No opening hours yet, so this barber cannot be booked.{" "}
          <Link href="/admin/hours" className="underline hover:text-white">
            Set hours
          </Link>
        </p>
      ) : null}
      {isNew ? (
        <p className="mt-4 text-xs text-white/50">
          New barbers start with no opening hours. Set them in Hours after adding.
        </p>
      ) : null}
      {initial && initial.futureBookings ? (
        <p className="mt-2 text-xs text-white/50">
          {initial.futureBookings} upcoming {initial.futureBookings === 1 ? "booking" : "bookings"}.
          Deactivating does not cancel them.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "Saving..." : isNew ? "Add barber" : "Save"}
        </button>
        {isNew ? (
          <button type="button" className={BTN_SECONDARY} onClick={() => setOpen(false)}>
            Cancel
          </button>
        ) : null}
      </div>
      <ResultMessage result={result} />
    </form>
  );
}
