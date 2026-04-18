'use client';

import { Track } from 'livekit-client';
import { useTracks, VideoTrack } from '@livekit/components-react';
import type { TrackReference } from '@livekit/components-react';

export function ScreenShareView() {
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const track = screenTracks[0] as TrackReference | undefined;

  if (!track) return null;

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
      <VideoTrack trackRef={track} className="w-full h-full object-contain" />
      <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {track.participant.name ?? 'Participant'} — Screen Share
      </span>
    </div>
  );
}
