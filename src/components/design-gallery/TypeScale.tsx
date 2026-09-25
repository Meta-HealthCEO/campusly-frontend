import { cn } from '@/lib/utils';
import { GallerySection } from './GallerySection';

interface Step {
  className: string;
  size: string;
  use: string;
  face: 'heading' | 'body';
  weight: string;
}

/** Spec §2.3: the scale, px / line-height. */
const STEPS: readonly Step[] = [
  { className: 'text-display', size: '36 / 40', use: 'Display, one per screen', face: 'heading', weight: 'font-bold tracking-[-0.025em]' },
  { className: 'text-h1-desktop', size: '30 / 36', use: 'h1, desktop', face: 'heading', weight: 'font-bold tracking-[-0.025em]' },
  { className: 'text-h1', size: '24 / 30', use: 'h1, phone', face: 'heading', weight: 'font-bold tracking-[-0.025em]' },
  { className: 'text-h2', size: '20 / 26', use: 'h2', face: 'heading', weight: 'font-bold tracking-[-0.02em]' },
  { className: 'text-h3', size: '17 / 24', use: 'h3, card titles', face: 'heading', weight: 'font-semibold tracking-[-0.015em]' },
  { className: 'text-body', size: '15 / 22', use: 'Body', face: 'body', weight: 'font-normal' },
  { className: 'text-small', size: '13 / 18', use: 'Small, table cells', face: 'body', weight: 'font-normal' },
  { className: 'text-caption', size: '12 / 16', use: 'Caption', face: 'body', weight: 'font-normal' },
  { className: 'text-eyebrow uppercase', size: '11.5, +0.09em', use: 'Eyebrow', face: 'body', weight: 'font-semibold' },
];

const SAMPLE = 'Closing two gaps in functions is worth the most marks';

/** The type scale in its two faces: Hanken Grotesk for headings and numbers, Source Sans 3 for body and UI. */
export function TypeScale() {
  return (
    <GallerySection
      id="type"
      index="02"
      title="Type"
      description="Hanken Grotesk for headings and numbers (tabular figures), Source Sans 3 for body and UI. Headings balance their lines."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <p className="text-eyebrow font-semibold uppercase text-muted-foreground">Headings and numbers</p>
          <p className="mt-2 font-heading text-display font-bold tracking-[-0.025em]">Hanken Grotesk</p>
          <p className="mt-1 font-heading text-h2 font-bold tabular-nums">0123456789 · 58–64% · +12.5</p>
        </div>
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <p className="text-eyebrow font-semibold uppercase text-muted-foreground">Body and UI</p>
          <p className="mt-2 text-h1 font-semibold">Source Sans 3</p>
          <p className="mt-1 text-muted-foreground">Regular 400, medium 500 and semibold 600 for labels, buttons and running text.</p>
        </div>
      </div>
      <ul className="divide-y divide-border rounded-card border border-border bg-card shadow-card">
        {STEPS.map((step: Step) => (
          <li key={step.className} className="grid gap-1 px-4 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6 sm:px-5">
            <div className="min-w-0">
              <p className="font-heading text-small font-semibold">{step.className}</p>
              <p className="text-caption tabular-nums text-muted-foreground">{step.size} · {step.use}</p>
            </div>
            <p className={cn('min-w-0 break-words', step.className, step.weight, step.face === 'heading' && 'font-heading')}>{SAMPLE}</p>
          </li>
        ))}
      </ul>
    </GallerySection>
  );
}
