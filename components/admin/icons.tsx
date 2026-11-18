// Small inline icons for the admin UI (decorative; always pair with text).
type P = { className?: string };

function Svg({ className = "size-4", children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export const XIcon = (p: P) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
export const CheckIcon = (p: P) => (
  <Svg {...p}>
    <path d="m5 12 5 5L20 7" />
  </Svg>
);
export const EyeOffIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a12.6 12.6 0 0 1-2.6 3.4M6.6 6.6A12.7 12.7 0 0 0 2.5 12c1 2 4.5 6 9.5 6 1.5 0 2.8-.4 4-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Svg>
);
export const PlusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const SearchIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
export const CalendarIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);
export const ClockIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const PlaneIcon = (p: P) => (
  <Svg {...p}>
    <path d="M10.5 13.5 3 11l1-1.5 8 .5 5-5a1.8 1.8 0 0 1 2.5 2.5l-5 5 .5 8L13.5 21 11 13.5" />
  </Svg>
);
export const ScissorsIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
  </Svg>
);
export const UserIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);
export const AlertIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17h.01" />
  </Svg>
);
export const DotIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </Svg>
);

/** Status marker: shape + colour, never colour alone. */
export function StatusIcon({
  status,
  onLight = false,
  className = "size-3.5",
}: {
  status: string;
  onLight?: boolean;
  className?: string;
}) {
  switch (status) {
    case "completed":
      return <CheckIcon className={`${className} ${onLight ? "text-green-700" : "text-green-400"}`} />;
    case "no_show":
      return <EyeOffIcon className={`${className} ${onLight ? "text-amber-700" : "text-amber-400"}`} />;
    case "cancelled":
      return <XIcon className={`${className} ${onLight ? "text-red-700" : "text-red-400"}`} />;
    case "pending":
      return <ClockIcon className={`${className} ${onLight ? "text-black/60" : "text-white/70"}`} />;
    default:
      return <DotIcon className={`${className} ${onLight ? "text-black/40" : "text-white/40"}`} />;
  }
}
