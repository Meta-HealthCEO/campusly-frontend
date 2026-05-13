'use client';

import { Check, CheckCircle2, Loader2 as Spin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CurriculumContextStatus } from '@/hooks/useCurriculumPreparation';

const STEPS = [
  { number: 1, label: 'Topics' },
  { number: 2, label: 'Details' },
  { number: 3, label: 'Generate' },
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <nav aria-label="New paper progress">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const complete = current > step.number;
          const active = current === step.number;
          return (
            <li key={step.number} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold', complete && 'bg-primary text-primary-foreground', active && 'bg-primary text-primary-foreground ring-4 ring-primary/20', !complete && !active && 'bg-muted text-muted-foreground')}>
                  {complete ? <Check className="h-4 w-4" /> : step.number}
                </span>
                <span className={cn('hidden text-xs font-medium sm:inline', active ? 'text-foreground' : 'text-muted-foreground')}>{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn('hidden h-0.5 flex-1 rounded-full sm:block', complete ? 'bg-primary' : 'bg-muted')} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ContextBadge({ status, error }: { status: CurriculumContextStatus; error: string | null }) {
  if (status === 'ready') return <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Ready</Badge>;
  if (status === 'preparing') return <Badge variant="outline" className="gap-1"><Spin className="h-3.5 w-3.5 animate-spin" />Preparing context</Badge>;
  if (status === 'error') return <span className="text-sm text-destructive">{error ?? 'Missing subject, grade, or term context.'}</span>;
  return null;
}
