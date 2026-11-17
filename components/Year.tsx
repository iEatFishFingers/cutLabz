"use client";

import { useSyncExternalStore } from "react";

// Next 16 disallows new Date() during prerender, so the server snapshot is a
// stable year and the client swaps in the current one after hydration.
const subscribe = () => () => {};

export default function Year() {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => 2026,
  );
  return <>{year}</>;
}
