import { Check } from 'lucide-react';
import { StartFreeLink } from './StartFreeLink';

interface PlanCard {
  name: string;
  price: string;
  cadence: string;
  note: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: PlanCard[] = [
  {
    name: 'Free',
    price: 'R0',
    cadence: 'for as long as you like',
    note: 'Start here. No card needed.',
    features: ['20 AI actions a month: lessons, papers, memos, marking', 'One teaching group', 'Attendance, homework and gradebook'],
  },
  {
    name: 'Pro',
    price: 'R149',
    cadence: 'a month, or R1,490 a year',
    note: 'When it becomes a habit. 14 days free first.',
    features: ['Up to 500 AI actions a month', 'AI lessons, papers, memos and marking', 'Unlimited classes and learners', 'Analytics and reports'],
    highlight: true,
  },
];

export function TeacherPlans() {
  return (
    <section id="plans" aria-labelledby="plans-heading" className="scroll-mt-16 border-t border-black/5 bg-(--dawn) text-(--midnight)">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <h2 id="plans-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing for one teacher</h2>
        <p className="mt-3 max-w-xl text-(--midnight)/70">
          Your school pays for Campusly? You already have it — sign in with your school account.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.highlight
                  ? 'rounded-2xl bg-(--midnight) p-6 text-white sm:p-8'
                  : 'rounded-2xl border border-black/10 bg-white p-6 sm:p-8'
              }
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                <span className="font-(family-name:--font-clock) text-5xl font-semibold tabular-nums tracking-[-0.04em]">{plan.price}</span>
                <span className={plan.highlight ? 'text-white/60' : 'text-(--midnight)/60'}>{plan.cadence}</span>
              </p>
              <p className={`mt-2 text-sm ${plan.highlight ? 'text-(--lavender)' : 'text-(--midnight)/70'}`}>{plan.note}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className={`mt-0.5 size-4 shrink-0 ${plan.highlight ? 'text-(--tick)' : 'text-(--violet)'}`} aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <StartFreeLink className="mt-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
