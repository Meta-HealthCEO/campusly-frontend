import { CheckCircle2 } from 'lucide-react';

const PERIODS = [
  { time: '08:00–08:45', cls: 'Grade 10', subject: 'Mathematics', taken: true },
  { time: '10:15–11:00', cls: 'Grade 11', subject: 'Physical Sciences', taken: false },
  { time: '12:00–12:45', cls: 'Grade 10', subject: 'Physical Sciences', taken: false },
];

const WAITING = [
  { label: 'Submissions to mark', count: 12 },
  { label: 'Homework due today', count: 1 },
];

/** Night turns to morning: the page switches to daylight for the Today view. */
export function MorningBand() {
  return (
    <section aria-labelledby="morning-heading" className="bg-(--dawn) text-(--midnight)">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="font-(family-name:--font-clock) text-6xl font-semibold tabular-nums tracking-[-0.04em] sm:text-7xl">
            07:30
          </p>
          <h2 id="morning-heading" className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your day, already sorted
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-(--midnight)/70">
            Open Campusly before first period and see today&apos;s classes, which registers are still
            open, and what&apos;s waiting to be marked — one tap to each.
          </p>
        </div>

        <figure aria-label="Example of the Today page" className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(13,18,36,0.35)] sm:p-6">
          <p className="text-sm font-medium">Good morning, Lindiwe</p>
          <p className="font-(family-name:--font-clock) text-xs tabular-nums text-(--midnight)/55">
            3 periods · 2 registers to take · 12 to mark
          </p>
          <ol className="mt-4 divide-y divide-black/5">
            {PERIODS.map((p) => (
              <li key={p.time} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-(family-name:--font-clock) text-xs tabular-nums text-(--midnight)/60">{p.time}</p>
                  <p className="truncate text-sm font-medium">
                    {p.cls} <span className="font-normal text-(--midnight)/60">· {p.subject}</span>
                  </p>
                </div>
                {p.taken ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-(--midnight)/55">
                    <CheckCircle2 className="size-3.5" aria-hidden /> Register taken
                  </span>
                ) : (
                  <span className="inline-flex h-8 shrink-0 items-center self-start rounded-md bg-(--midnight) px-3 text-xs font-medium text-white sm:self-auto">
                    Take register
                  </span>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-2 grid grid-cols-1 gap-2 border-t border-black/5 pt-4 sm:grid-cols-2">
            {WAITING.map((w) => (
              <div key={w.label} className="flex items-center justify-between rounded-lg bg-(--dawn) px-3 py-2">
                <span className="text-xs">{w.label}</span>
                <span className="font-(family-name:--font-clock) text-sm font-semibold tabular-nums text-(--violet)">{w.count}</span>
              </div>
            ))}
          </div>
        </figure>
      </div>
    </section>
  );
}
