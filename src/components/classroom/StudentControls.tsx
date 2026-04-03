'use client';

import { HandIcon, MicIcon, MicOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudentControlsProps {
  onRaiseHand?: () => void;
  onToggleAudio?: () => void;
  handRaised: boolean;
  audioMuted?: boolean;
}

export function StudentControls({
  onRaiseHand,
  onToggleAudio,
  handRaised,
  audioMuted = false,
}: StudentControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      {onRaiseHand && (
        <Button
          variant={handRaised ? 'default' : 'outline'}
          size="default"
          onClick={onRaiseHand}
          className="flex items-center gap-2"
          aria-pressed={handRaised}
        >
          <HandIcon className="size-4" />
          {handRaised ? 'Lower Hand' : 'Raise Hand'}
        </Button>
      )}

      {onToggleAudio && (
        <Button
          variant={audioMuted ? 'destructive' : 'outline'}
          size="default"
          onClick={onToggleAudio}
          className="flex items-center gap-2"
          aria-pressed={audioMuted}
        >
          {audioMuted ? (
            <>
              <MicOffIcon className="size-4" />
              Unmute
            </>
          ) : (
            <>
              <MicIcon className="size-4" />
              Mute
            </>
          )}
        </Button>
      )}
    </div>
  );
}
