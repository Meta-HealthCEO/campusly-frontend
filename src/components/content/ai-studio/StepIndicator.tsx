'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
  number: number;
}

const STEPS: Step[] = [
  { number: 1, label: 'Choose Topic' },
  { number: 2, label: 'Configure' },
  { number: 3, label: 'Generate' },
  { number: 4, label: 'Preview' },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((step, idx) => {
          const isComplete = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          return (
            <li key={step.number} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                    isComplete && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !isComplete && !isCurrent && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : step.number}
                </span>
                <span
                  className={cn(
                    'hidden text-xs font-medium sm:inline',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'hidden h-0.5 flex-1 rounded-full transition-colors duration-300 sm:block',
                    isComplete ? 'bg-primary' : 'bg-muted',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
