import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FreeAllowanceBannerProps {
  remaining: number;
  limit: number;
  onSeePlans: () => void;
}

/** "2 of 3 free AI papers left" — shown to free-plan teachers above the wizard. */
export function FreeAllowanceBanner({ remaining, limit, onSeePlans }: FreeAllowanceBannerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-sm font-medium">
            {remaining} of {limit} free AI {limit === 1 ? 'paper' : 'papers'} left
          </p>
          <p className="text-xs text-muted-foreground">
            Try it on a real test. After that, Pro keeps it going — with a 14-day free trial.
          </p>
        </div>
      </div>
      <Button variant="outline" onClick={onSeePlans} className="w-full sm:w-auto">
        See plans
      </Button>
    </div>
  );
}
