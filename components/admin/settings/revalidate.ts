import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

/** After any successful catalog/hours/time-off write: mark the public booking
 *  catalog cache stale (two-arg profile form, per Next docs revalidateTag.md)
 *  and refresh the admin page(s). */
export function revalidateCatalog(...adminPaths: string[]) {
  revalidateTag("catalog", "max");
  for (const p of adminPaths) revalidatePath(p);
}
