'use client';

import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  onStepClick: (step: number) => void;
  canProceed: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  stepLabels,
  onStepClick,
  canProceed,
  onNext,
  onBack,
}: WizardNavigationProps) {
  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {stepLabels.map((label, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <button
              key={step}
              onClick={() => onStepClick(step)}
              className={cn(
                'flex flex-col items-center gap-1 min-w-[4rem] sm:min-w-[6rem] transition-colors',
                isActive && 'text-primary',
                isCompleted && 'text-primary/70',
                !isActive && !isCompleted && 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium border-2 transition-colors',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-primary bg-primary/10 text-primary',
                  !isActive && !isCompleted && 'border-muted-foreground/30',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step}
              </span>
              <span className="hidden text-xs font-medium sm:block">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        {currentStep < totalSteps ? (
          <Button size="sm" onClick={onNext} disabled={!canProceed}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
