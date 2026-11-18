"use client";

import { createContext, useContext } from "react";

/** Only what the booking UI needs about the signed-in customer. */
export type BookingViewer = {
  name: string;
  email: string;
  phone: string;
  /** Active membership today, or null. endsOn is inclusive. */
  membership: { plan: string; endsOn: string } | null;
  /** Upcoming-booking limits for early warnings (the server still enforces them). */
  limits?: {
    upcomingCount: number;
    /** Shop-local "YYYY-MM-DD" date and start minute of the upcoming member cut. */
    upcomingMemberCut: { date: string; startMin: number } | null;
  };
};

const ViewerContext = createContext<BookingViewer | null>(null);

export function ViewerProvider({
  viewer,
  children,
}: {
  viewer: BookingViewer;
  children: React.ReactNode;
}) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer(): BookingViewer {
  const v = useContext(ViewerContext);
  if (!v) throw new Error("useViewer must be used inside <ViewerProvider>");
  return v;
}

/** One-offs are open to everyone; a membership cut only to the member whose plan it is. */
export function canUseService(
  viewer: BookingViewer,
  service: { id: string; kind: "membership" | "one-off" },
): boolean {
  return service.kind === "one-off" || viewer.membership?.plan === service.id;
}
