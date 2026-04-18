'use client';

import { HandIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudentControlsProps {
  handRaised: boolean;
  onRaiseHand: () => void;
  onLowerHand: () => void;
}

export function StudentControls({ handRaised, onRaiseHand, onLowerHand }: StudentControlsProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-3">
      <Button
        variant={handRaised ? 'default' : 'outline'}
        size="default"
        onClick={handRaised ? onLowerHand : onRaiseHand}
        aria-pressed={handRaised}
      >
        <HandIcon className="size-4 mr-1.5" />
        {handRaised ? 'Lower Hand' : 'Raise Hand'}
      </Button>
    </div>
  );
}
