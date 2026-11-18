import { formatTime } from "@/lib/availability";
import type { AdminBooking } from "@/lib/admin/bookings-shared";

export default function NextUp({
  barbers,
  next,
}: {
  barbers: { id: string; name: string }[];
  next: Record<string, AdminBooking | undefined>;
}) {
  return (
    <section className="border border-white/10 bg-[#0b0b0b] p-4">
      <h2 className="text-xs tracking-[0.2em] uppercase text-white/50">Next up</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {barbers.map((b) => {
          const n = next[b.id];
          return (
            <li key={b.id} className="min-w-0 text-sm">
              <span className="text-white/50">{b.name}</span>
              <span className="block truncate">
                {n ? (
                  <>
                    {formatTime(n.startMin)} · <bdi>{n.name}</bdi> · {n.serviceName}
                  </>
                ) : (
                  "Nothing else today"
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
