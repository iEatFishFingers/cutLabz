"use client";

import { useActionState, useState } from "react";
import { saveAddon, saveService } from "@/app/admin/(panel)/services/actions";
import { LIMITS, type ActionResult } from "@/lib/admin/catalog-admin";
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
  const [formKey, setFormKey] = useState(0);
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const r = await (type === "service" ? saveService(prev, fd) : saveAddon(prev, fd));
      if (r.ok && isNew) {
        setFormKey((k) => k + 1); // reset the blank form
        setOpen(false);
      }
      return r;
    },
    null,
  );
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

  return (
    <form key={formKey} action={action} className={CARD}>
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
            defaultValue={initial?.name ?? ""}
            className={INPUT}
          />
          <FieldError result={result} name="name" />
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
              defaultValue={initial?.description ?? ""}
              className={INPUT}
            />
            <FieldError result={result} name="description" />
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
            defaultValue={initial?.price ?? ""}
            className={INPUT}
          />
          <FieldError result={result} name="price" />
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
                defaultValue={initial?.durationMin ?? "30"}
                className={INPUT}
              />
              <FieldError result={result} name="durationMin" />
            </div>
            <div>
              <label htmlFor={`${uid}-kind`} className={LABEL}>
                Type
              </label>
              <select
                id={`${uid}-kind`}
                name="kind"
                defaultValue={initial?.kind ?? "one-off"}
                className={INPUT}
              >
                <option value="one-off">One-off</option>
                <option value="membership">Membership</option>
              </select>
              <FieldError result={result} name="kind" />
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
              defaultValue={initial?.extraMin ?? "0"}
              className={INPUT}
            />
            <FieldError result={result} name="extraMin" />
          </div>
        )}

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
}
