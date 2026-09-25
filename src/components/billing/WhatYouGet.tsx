import { Check } from 'lucide-react';
import { planLines, type TeacherPlan } from '@/lib/billing-copy';

const PLANS: Array<{ plan: TeacherPlan; name: string }> = [
  { plan: 'free', name: 'Free' },
  { plan: 'pro', name: 'Pro' },
];

/** Free vs Pro for a standalone teacher, with the plan they're on marked. */
export function WhatYouGet({ current }: { current: TeacherPlan }) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6" aria-labelledby="what-you-get-heading">
      <h2 id="what-you-get-heading" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        What you get
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLANS.map(({ plan, name }) => (
          <div
            key={plan}
            className={`rounded-xl border p-4 ${plan === current ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
          >
            <p className="flex items-center gap-2 font-semibold">
              {name}
              {plan === current ? <span className="text-xs font-medium text-primary">Your plan</span> : null}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {planLines(plan).map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
