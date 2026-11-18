/** Suspense fallback for auth forms: no inputs or labels, so the DOM never holds a second field. */
export default function AuthSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="space-y-5 animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-11 border border-white/10 bg-white/5" />
      ))}
      <div className="h-11 bg-white/10" />
    </div>
  );
}
