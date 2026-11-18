"use client";

import { useActionState, useState } from "react";
import { saveAddon, saveService } from "@/app/admin/(panel)/services/actions";
import { LIMITS, type ActionResult } from "@/lib/admin/catalog-admin";
import { useFieldErrors } from "./use-field-errors";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, FieldError, INPUT, LABEL, ResultMessage } from "./ui";

export type ItemValues = {
  id: string;
  name: string;
  description?: string;
  durationMin?: string;
  extraMin?: string;
  price: string;
  kind?: string;
  active: boolean;
};

/** One editable service/add-on card. `initial === null` renders the "new" form. */
export default function ItemForm({
  type,
  initial,
}: {
  type: "service" | "addon";
  initial: ItemValues | null;
}) {
  const isNew = initial === null;
  const [open, setOpen] = useState(false);
  const blank = {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? "",
    durationMin: initial?.durationMin ?? "30",
    extraMin: initial?.extraMin ?? "0",
    kind: initial?.kind ?? "one-off",
    active: initial?.active ?? true,
  };
  // Controlled values: React resets uncontrolled fields after a form action, which wiped
  // the user's input on a validation error.
  const [vals, setVals] = useState(blank);
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const r = await (type === "service" ? saveService(prev, fd) : saveAddon(prev, fd));
      if (r.ok && isNew) {
        setVals(blank); // reset the blank form
        setOpen(false);
      }
      return r;
    },
    null,
  );
  const { err, clear } = useFieldErrors(result);
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => {
    setVals((p) => ({ ...p, [k]: v }));
    clear(k);
  };
  const uid = `${type}-${initial?.id ?? "new"}`;
  const label = type === "service" ? "service" : "add-on";

  if (isNew && !open) {
    return (
      <div>
        <button type="button" className={BTN_SECONDARY} onClick={() => setOpen(true)}>
          Add {label}
        </button>
        {result?.ok ? <ResultMessage result={result} /> : null}
      </div>
    );
  }

  const form = (
    <form action={action} className={CARD}>
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-name`} className={LABEL}>
            Name
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            required
            maxLength={type === "service" ? LIMITS.serviceName : LIMITS.addonName}
            value={vals.name}
            onChange={(e) => set("name", e.target.value)}
            className={INPUT}
          />
          <FieldError message={err("name")} />
        </div>

        {type === "service" ? (
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-desc`} className={LABEL}>
              Description <span className="text-white/30">(optional)</span>
            </label>
            <input
              id={`${uid}-desc`}
              name="description"
              maxLength={LIMITS.description}
              value={vals.description}
              onChange={(e) => set("description", e.target.value)}
              className={INPUT}
            />
            <FieldError message={err("description")} />
          </div>
        ) : null}

        <div>
          <label htmlFor={`${uid}-price`} className={LABEL}>
            Price (£)
          </label>
          <input
            id={`${uid}-price`}
            name="price"
            inputMode="decimal"
            required
            placeholder="25.00"
            value={vals.price}
            onChange={(e) => set("price", e.target.value)}
            className={INPUT}
          />
          <FieldError message={err("price")} />
        </div>

        {type === "service" ? (
          <>
            <div>
              <label htmlFor={`${uid}-dur`} className={LABEL}>
                Duration (minutes)
              </label>
              <input
                id={`${uid}-dur`}
                name="durationMin"
                inputMode="numeric"
                required
                value={vals.durationMin}
                onChange={(e) => set("durationMin", e.target.value)}
                className={INPUT}
              />
              <FieldError message={err("durationMin")} />
            </div>
            <div>
              <label htmlFor={`${uid}-kind`} className={LABEL}>
                Type
              </label>
              <select
                id={`${uid}-kind`}
                name="kind"
                value={vals.kind}
                onChange={(e) => set("kind", e.target.value)}
                className={INPUT}
              >
                <option value="one-off">One-off</option>
                <option value="membership">Membership</option>
              </select>
              <FieldError message={err("kind")} />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor={`${uid}-extra`} className={LABEL}>
              Extra time (minutes)
            </label>
            <input
              id={`${uid}-extra`}
              name="extraMin"
              inputMode="numeric"
              required
              value={vals.extraMin}
              onChange={(e) => set("extraMin", e.target.value)}
              className={INPUT}
            />
            <FieldError message={err("extraMin")} />
          </div>
        )}

        <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-xs uppercase tracking-[0.2em] text-white/60">
          <input
            type="checkbox"
            name="active"
            checked={vals.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-5 w-5 accent-white"
          />
          Active
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "Saving..." : isNew ? `Add ${label}` : "Save"}
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

  if (isNew || type !== "service" || !initial) return form;

  // Existing services collapse into an accordion. The form stays mounted while closed,
  // so unsaved edits survive toggling.
  return (
    <details className="group bg-[#111] border border-white/10">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 break-words text-sm text-white">{initial.name}</span>
        <span className="text-xs text-white/50">
          £{initial.price} · {initial.durationMin} min ·{" "}
          <span className={initial.active ? "text-green-400" : "text-white/40"}>
            {initial.active ? "Active" : "Inactive"}
          </span>
          <span aria-hidden="true" className="ml-3 inline-block transition group-open:rotate-90">
            ›
          </span>
        </span>
      </summary>
      <div className="border-t border-white/10 [&>form]:border-0">{form}</div>
    </details>
  );
}
