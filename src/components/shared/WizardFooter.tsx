'use client';

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';
import { wizardFooterPlacement } from '@/lib/wizard-footer';

interface WizardFooterProps {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextIcon?: React.ReactNode;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  /** When set, Next becomes a form-submit trigger for the form with this id. */
  nextFormId?: string;
  /** When true, treats Next as the terminal action (wider button, no chevron). */
  isFinal?: boolean;
  /** Optional extra content rendered between Back and the Next button. */
  centerSlot?: React.ReactNode;
  /** Optional secondary action rendered to the left of Next (e.g. "Skip", "Save draft"). */
  secondary?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  className?: string;
}

/**
 * Floating pill pinned to the bottom-centre of the content area (excludes
 * the sidebar). Sits above content with a shadow + backdrop blur so the
 * controls are always reachable in long wizards. Pair with `pb-24` on the
 * wizard root so the last field isn't hidden underneath.
 */
export function WizardFooter({
  step,
  totalSteps,
  onBack,
  onNext,
  nextLabel,
  nextIcon,
  nextDisabled,
  nextLoading,
  nextFormId,
  isFinal,
  centerSlot,
  secondary,
  className,
}: WizardFooterProps) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const showBack = Boolean(onBack) && step > 1;
  const placement = wizardFooterPlacement(sidebarCollapsed);
  const resolvedLabel = nextLabel ?? (isFinal ? 'Submit' : 'Next');
  const resolvedIcon = nextLoading
    ? <Loader2 className="ml-1 h-4 w-4 animate-spin" />
    : nextIcon ?? (isFinal ? null : <ChevronRight className="ml-1 h-4 w-4" />);

  return (
    <div
      className={cn(placement.outer, className)}
    >
      <div className={placement.inner}>
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4">
          <div className="flex-1">
            {showBack && (
              <Button variant="outline" size="sm" onClick={onBack} disabled={nextLoading}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
          </div>

          <div className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
            {centerSlot ?? (
              totalSteps > 1 && <span>Step {step} of {totalSteps}</span>
            )}
          </div>

          <div className="flex flex-1 justify-end gap-2">
            {secondary && (
              <Button
                variant="outline"
                size="sm"
                onClick={secondary.onClick}
                disabled={secondary.disabled || secondary.loading || nextLoading}
              >
                {secondary.loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                {secondary.label}
              </Button>
            )}
            {(onNext || nextFormId) && (
              <Button
                type={nextFormId ? 'submit' : 'button'}
                form={nextFormId}
                onClick={nextFormId ? undefined : onNext}
                disabled={nextDisabled || nextLoading}
                size={isFinal ? 'default' : 'sm'}
              >
                {resolvedLabel}
                {resolvedIcon}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
