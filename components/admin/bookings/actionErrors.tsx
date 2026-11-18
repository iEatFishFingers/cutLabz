"use client";

// Distinguishes a failed request (offline / dropped) from a rejected one, and a
// thrown server error (the admin actions only throw "Unauthorized") from both.

export type ActionFailure =
  | { kind: "offline" }
  | { kind: "session"; next: string }
  | { kind: "server"; message: string };

export function classifyThrown(e: unknown): ActionFailure {
  const msg = e instanceof Error ? e.message : "";
  const offline =
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    e instanceof TypeError ||
    /failed to fetch|network|load failed|fetch failed/i.test(msg);
  if (offline) return { kind: "offline" };
  const next =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/admin";
  return { kind: "session", next };
}

export function FailureMessage({ failure }: { failure: ActionFailure }) {
  if (failure.kind === "offline") {
    return (
      <p role="alert" className="text-sm text-red-400">
        No connection. Nothing was saved. Try again.
      </p>
    );
  }
  if (failure.kind === "session") {
    return (
      <p role="alert" className="text-sm text-red-400">
        Your session expired. Nothing was saved.{" "}
        <a
          href={`/admin/login?next=${encodeURIComponent(failure.next)}`}
          className="underline underline-offset-4"
        >
          Sign in again
        </a>
      </p>
    );
  }
  return (
    <p role="alert" className="text-sm text-red-400">
      {failure.message}
    </p>
  );
}
