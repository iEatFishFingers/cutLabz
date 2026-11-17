import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { formatPounds } from "@/lib/admin/catalog-admin";
import ItemForm, { type ItemValues } from "@/components/admin/settings/ItemForm";
import { PageHeader, PanelSkeleton } from "@/components/admin/settings/ui";

export const metadata = { title: "Services | Cut Labz Admin" };

async function ServicesContent() {
  const { db } = await requireAdmin();
  const [services, addons] = await Promise.all([
    db
      .from("services")
      .select("id,name,description,duration_min,price_pence,kind,active")
      .order("name"),
    db.from("addons").select("id,name,price_pence,extra_min,active").order("name"),
  ]);
  if (services.error || addons.error) {
    return <p className="text-sm text-red-400">Could not load services. Refresh to try again.</p>;
  }
  const s: ItemValues[] = (services.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? "",
    durationMin: String(r.duration_min),
    price: formatPounds(r.price_pence as number),
    kind: r.kind as string,
    active: Boolean(r.active),
  }));
  const a: ItemValues[] = (addons.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    price: formatPounds(r.price_pence as number),
    extraMin: String(r.extra_min),
    active: Boolean(r.active),
  }));

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-white/60">Services</h2>
        <p className="mb-4 text-xs text-white/40">
          Services cannot be deleted because past bookings refer to them. Untick Active to hide one
          from the booking page.
        </p>
        <div className="space-y-3">
          {s.map((v) => (
            <ItemForm key={v.id} type="service" initial={v} />
          ))}
          <ItemForm type="service" initial={null} />
        </div>
      </section>
      <section>
        <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-white/60">Add-ons</h2>
        <p className="mb-4 text-xs text-white/40">
          Add-ons cannot be deleted either. Untick Active to stop offering one.
        </p>
        <div className="space-y-3">
          {a.map((v) => (
            <ItemForm key={v.id} type="addon" initial={v} />
          ))}
          <ItemForm type="addon" initial={null} />
        </div>
      </section>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <div>
      <PageHeader
        title="Services and add-ons"
        intro="Prices are in pounds. Changes appear on the booking page within moments."
      />
      <Suspense fallback={<PanelSkeleton />}>
        <ServicesContent />
      </Suspense>
    </div>
  );
}
