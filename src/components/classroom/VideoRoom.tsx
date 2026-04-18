'use client';

import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { VideoLayout } from './VideoLayout';

interface VideoRoomProps {
  token: string;
  serverUrl: string;
  isTeacher: boolean;
  onDisconnected?: () => void;
}

export function VideoRoom({ token, serverUrl, isTeacher, onDisconnected }: VideoRoomProps) {
  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center w-full min-h-60 rounded-xl border-2 border-dashed border-muted bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Video is not configured for this session.
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio={isTeacher}
      video={isTeacher}
      onDisconnected={onDisconnected}
      className="w-full rounded-xl border bg-card overflow-hidden"
    >
      <RoomAudioRenderer />
      <VideoLayout isTeacher={isTeacher} />
    </LiveKitRoom>
  );
}
