'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  aiGeneration: 'AI question generation',
  paperGeneration: 'Paper generation',
  advancedAnalytics: 'Advanced analytics',
};

export function UpgradeModal({ open, onOpenChange, feature }: Props) {
  const router = useRouter();
  const label = feature ? FEATURE_LABELS[feature] ?? 'this feature' : 'this feature';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Pro feature
          </DialogTitle>
          <DialogDescription>
            {label} is a Pro feature. Start a 14-day free trial to use it.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 text-sm text-muted-foreground">
          <ul className="space-y-2 list-disc pl-5">
            <li>14 days free, no charge during the trial</li>
            <li>Cancel anytime from your billing settings</li>
            <li>R149/month or R1,490/year (2 months free)</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              router.push('/subscription');
            }}
          >
            See plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
