import type { Metadata } from "next";
import Link from "next/link";
import CancelMembership from "@/components/account/membership/CancelMembership";
import PlanCards from "@/components/account/membership/PlanCards";
import { BTN_PRIMARY, LABEL } from "@/components/account/bookings/ui";
import { formatDate, shopNow } from "@/lib/booking-shared";
import { getMembershipOverview } from "@/lib/customer/memberships";
import { requireCustomer } from "@/lib/customer/viewer";
import { MEMBERSHIP_PLANS, type Membership } from "@/lib/membership";

export const metadata: Metadata = {
  title: "Membership | Cut Labz",
  robots: { index: false, follow: false },
};

const dayNum = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd) / 86_400_000;
};
const planName = (id: string) => MEMBERSHIP_PLANS.find((p) => p.id === id)?.name ?? id;

function daysLeftLabel(endsOn: string, today: string): string {
  const n = dayNum(endsOn) - dayNum(today) + 1; // today counts
  if (n <= 1) return "Last day today";
  return `${n} days left`;
}

function PastPlans({ plans }: { plans: Membership[] }) {
  if (plans.length === 0) return null;
  return (
    <section aria-labelledby="past-plans" className="mt-10">
      <h2 id="past-plans" className={`mb-3 ${LABEL}`}>
        Past plans
      </h2>
      <ul className="border border-white/10 divide-y divide-white/10">
        {plans.map((m) => (
          <li key={m.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span className="text-white/80">{planName(m.plan)}</span>
            <span className="text-white/40">
              {formatDate(m.startsOn)} – {formatDate(m.endsOn)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const viewer = await requireCustomer("/account/membership");
  const today = shopNow().date;
  const { current, past } = await getMembershipOverview(viewer, today);
  const joined = sp.joined === "1" && current != null;
  const planParam = typeof sp.plan === "string" ? sp.plan : null;
  const highlight = MEMBERSHIP_PLANS.some((p) => p.id === planParam) ? planParam : null;

  if (current) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Membership</h1>
        {joined && (
          <div role="status" className="mt-6">
            <p className="text-sm text-green-400">
              You&apos;re in. Your {planName(current.plan)} membership is active.
            </p>
            <Link href="/book" className={`mt-4 ${BTN_PRIMARY}`}>
              Book your first cut
            </Link>
          </div>
        )}

        <section
          aria-label="Current plan"
          className="mt-6 bg-[#111] border border-white/10 rounded-xl p-6 md:p-8"
        >
          <p className={LABEL}>Current plan</p>
          <p className="mt-3 text-3xl font-[500] tracking-[-0.02em]">{planName(current.plan)}</p>
          {current.cancelledAt ? (
            <p className="mt-3 text-sm text-amber-300">
              Cancelled. Active until {formatDate(current.endsOn, { long: true })}
            </p>
          ) : (
            <p className="mt-3 text-sm text-white/80">
              Active until {formatDate(current.endsOn, { long: true })}
            </p>
          )}
          <p className="mt-1 text-sm text-white/50">{daysLeftLabel(current.endsOn, today)}</p>
          <p className="mt-6 text-sm text-white/60">
            Unlimited cuts: one upcoming member cut at a time. You can&apos;t book past{" "}
            {formatDate(current.endsOn, { long: true })}.
          </p>
          <Link href="/book" className={`mt-6 ${BTN_PRIMARY}`}>
            Book a cut
          </Link>
          {!current.cancelledAt && (
            <CancelMembership endsOnLabel={formatDate(current.endsOn, { long: true })} />
          )}
        </section>

        <PastPlans plans={past} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Membership</h1>
      <p className="mt-2 text-sm text-white/60">
        Unlimited cuts, one upcoming member cut at a time.
      </p>
      <p className="mt-4 text-sm text-white/50 border border-white/10 bg-[#0b0b0b] px-4 py-3">
        Payments aren&apos;t set up yet — joining starts a free 30-day trial membership.
      </p>
      <div className="mt-6">
        <PlanCards highlight={highlight} />
      </div>
      <PastPlans plans={past} />
    </div>
  );
}
