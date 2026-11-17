import "server-only";
import { headers } from "next/headers";

/** Site origin from trusted request headers (never from client input). */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto === "http" ? "http" : "https"}://${host}`;
}
