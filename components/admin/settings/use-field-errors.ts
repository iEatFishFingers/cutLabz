"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/admin/catalog-admin";

/** Field errors from the latest action result, each hidden as soon as that field is edited. */
export function useFieldErrors(result: ActionResult | null) {
  const [cleared, setCleared] = useState<{ r: ActionResult | null; names: string[] }>({
    r: null,
    names: [],
  });
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const err = (name: string): string | undefined =>
    cleared.r === result && cleared.names.includes(name) ? undefined : errors[name];
  const clear = (name: string) =>
    setCleared((c) =>
      c.r === result
        ? c.names.includes(name)
          ? c
          : { r: result, names: [...c.names, name] }
        : { r: result, names: [name] },
    );
  return { err, clear };
}
