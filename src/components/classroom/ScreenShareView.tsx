'use client';

import { Monitor } from 'lucide-react';

interface ScreenShareViewProps {
  isSharing: boolean;
  sharerName?: string;
}

export function ScreenShareView({ isSharing, sharerName }: ScreenShareViewProps) {
  if (!isSharing) return null;

  return (
    <div className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-muted/30 aspect-video">
      <div className="flex flex-col items-center gap-3 text-center p-6">
        <div className="rounded-full bg-primary/10 p-4">
          <Monitor className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Screen share from{' '}
          <span className="text-primary">{sharerName ?? 'participant'}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Integrate a WebRTC screen share stream here (e.g. Daily.co, LiveKit, Agora).
        </p>
      </div>
    </div>
  );
}
