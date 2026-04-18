'use client';

import { useParticipants } from '@livekit/components-react';
import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon } from 'lucide-react';
export function ParticipantGrid() {
  const participants = useParticipants();

  if (participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">No participants yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {participants.map((p) => (
        <div
          key={p.sid}
          className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground shrink-0">
            {(p.name ?? p.identity).slice(0, 2).toUpperCase()}
          </div>
          <span className="flex-1 text-sm font-medium truncate">
            {p.name ?? p.identity}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {p.isMicrophoneEnabled ? (
              <MicIcon className="size-3.5 text-emerald-600" />
            ) : (
              <MicOffIcon className="size-3.5 text-muted-foreground" />
            )}
            {p.isCameraEnabled ? (
              <VideoIcon className="size-3.5 text-emerald-600" />
            ) : (
              <VideoOffIcon className="size-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
