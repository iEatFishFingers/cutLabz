"use client";

import { useSyncExternalStore } from "react";
import { shopNow } from "@/lib/booking-shared";

// Shop-local "today" as an external store. The clock is only read on the client
// after hydration (server snapshot is null), and it refreshes itself at the next
// shop-local midnight and whenever the tab becomes visible again.

let cached: string | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function refresh() {
  const d = shopNow().date;
  if (d !== cached) {
    cached = d;
    listeners.forEach((l) => l());
  }
}

function schedule() {
  clearTimeout(timer);
  const at = new Date();
  const { min } = shopNow(at);
  const ms =
    (1440 - min) * 60_000 - at.getSeconds() * 1000 - at.getMilliseconds() + 500;
  timer = setTimeout(
    () => {
      refresh();
      schedule();
    },
    Math.max(1000, Math.min(ms, 2 ** 31 - 1)),
  );
}

function onWake() {
  if (document.visibilityState === "visible") {
    refresh();
    schedule();
  }
}

function subscribe(cb: () => void) {
  if (listeners.size === 0) {
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    schedule();
  }
  listeners.add(cb);
  refresh();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    }
  };
}

const getSnapshot = () => (cached ??= shopNow().date);
const getServerSnapshot = () => null;

export function useShopToday(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
