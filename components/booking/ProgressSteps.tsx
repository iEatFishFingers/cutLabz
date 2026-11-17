"use client";

export const STEP_LABELS = ["SERVICE", "BARBER", "TIME", "DETAILS", "CONFIRM"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

type Props = {
  step: number;
  maxReached: number;
  onJump: (step: number) => void;
};

export default function ProgressSteps({ step, maxReached, onJump }: Props) {
  const total = STEP_LABELS.length;
  const pct = ((step + 1) / total) * 100;

  return (
    <nav aria-label="Booking progress" className="mb-10">
      {/* Mobile: compact text indicator */}
      <p className="md:hidden text-xs tracking-[0.25em] text-white/50" aria-hidden="true">
        STEP {pad(step + 1)} / {pad(total)} <span className="text-white/30">•</span>{" "}
        <span className="text-white">{STEP_LABELS[step]}</span>
      </p>

      <ol className="hidden md:flex items-center gap-6 lg:gap-8">
        {STEP_LABELS.map((label, i) => {
          const current = i === step;
          const reachable = i <= maxReached && !current;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={!reachable}
                aria-current={current ? "step" : undefined}
                className={`text-xs tracking-[0.25em] transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-white focus-visible:outline-offset-2 ${
                  current
                    ? "text-white cursor-default"
                    : reachable
                      ? "text-white/60 hover:text-white"
                      : "text-white/30 cursor-not-allowed"
                }`}
              >
                <span className="mr-2 text-white/30">{pad(i + 1)}</span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Screen-reader-only list for mobile, so the progress is still announced */}
      <ol className="sr-only md:hidden">
        {STEP_LABELS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            Step {i + 1} of {total}: {label.toLowerCase()}
          </li>
        ))}
      </ol>

      <div className="mt-4 h-px bg-white/10 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-white transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </nav>
  );
}
