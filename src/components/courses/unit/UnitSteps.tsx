import { Check } from 'lucide-react';

export type UnitStep = 'scope' | 'outline' | 'writing' | 'release' | 'released';

const STEPS: Array<{ key: Exclude<UnitStep, 'released'>; title: string; detail: string }> = [
  { key: 'scope', title: 'Pick class and topics', detail: 'CAPS topics and ATP weeks come with the term.' },
  { key: 'outline', title: 'Check the outline', detail: 'Modules, items and minutes. Nothing is written yet.' },
  { key: 'writing', title: 'Items are written', detail: 'Notes, worked examples and quick checks, in the background.' },
  { key: 'release', title: 'Release to your class', detail: 'Learners work through it on any phone.' },
];

/** Where the teacher is in building a unit. The order is real: each step needs the one before. */
export function UnitSteps({ current, noun = 'unit' }: { current: UnitStep; noun?: string }) {
  const at = current === 'released' ? STEPS.length : STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="space-y-3 rounded-xl border border-border bg-card p-4" aria-label={`Building a ${noun}`}>
      {STEPS.map((step, i) => {
        const done = i < at;
        const now = i === at;
        return (
          <li key={step.key} className="flex gap-3" aria-current={now ? 'step' : undefined}>
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-heading text-xs tabular-nums ${
                done ? 'bg-success-soft text-success' : now ? 'bg-accent text-accent-foreground ring-1 ring-accent-foreground/40' : 'bg-muted text-muted-foreground'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-label="Done" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm ${now ? 'font-semibold' : 'font-medium'} ${done ? 'text-muted-foreground' : ''}`}>{step.title}</span>
              <span className="block text-xs text-muted-foreground">{step.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
