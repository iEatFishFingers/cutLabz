import { SHOP_CONTACT } from "@/lib/shop-contact";
import { LINK } from "./bookings/ui";

/** Tappable phone and email for the shop, inline. */
export default function ContactLinks({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <a href={SHOP_CONTACT.phoneHref} className={LINK}>
        {SHOP_CONTACT.phone}
      </a>
      {" or "}
      <a href={SHOP_CONTACT.emailHref} className={LINK}>
        {SHOP_CONTACT.email}
      </a>
    </span>
  );
}
