const FOCUS =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-white focus-visible:outline-offset-2";

export const BTN_PRIMARY = `inline-flex items-center justify-center min-h-11 px-6 text-xs tracking-[0.2em] uppercase bg-white text-black border border-white hover:bg-transparent hover:text-white transition disabled:opacity-40 disabled:pointer-events-none ${FOCUS}`;
export const BTN_SECONDARY = `inline-flex items-center justify-center min-h-11 px-6 text-xs tracking-[0.2em] uppercase border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-40 disabled:pointer-events-none ${FOCUS}`;
export const LABEL = "text-xs tracking-[0.2em] uppercase text-white/40";
export const LINK = `underline underline-offset-4 hover:text-white transition ${FOCUS}`;
export { FOCUS };

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
};

/** Customer-facing status: a pending/confirmed booking whose start has passed reads "Past". */
export function bookingStatusLabel(b: {
  status: string;
  started: boolean;
  cancelledBy?: "customer" | "shop" | null;
}): string {
  if ((b.status === "confirmed" || b.status === "pending") && b.started) return "Past";
  if (b.status === "cancelled") {
    return b.cancelledBy === "shop"
      ? "Cancelled by the shop"
      : b.cancelledBy === "customer"
        ? "Cancelled by you"
        : "Cancelled";
  }
  return STATUS_LABEL[b.status] ?? b.status;
}
