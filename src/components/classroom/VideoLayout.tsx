'use client';

import { useMemo } from 'react';
import { Track } from 'livekit-client';
import { useParticipants, useTracks, VideoTrack } from '@livekit/components-react';
import type { TrackReference } from '@livekit/components-react';
import { UsersIcon } from 'lucide-react';

interface VideoLayoutProps {
  isTeacher: boolean;
}

export function VideoLayout({ isTeacher }: VideoLayoutProps) {
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);

  const activeScreen = screenTracks[0] as TrackReference | undefined;

  /* Teacher is usually the first participant; fall back to first camera track */
  const teacherTrack = useMemo(() => {
    const teacher = cameraTracks.find(
      (t) => (t as TrackReference).participant.identity !== undefined && !isTeacher
        ? false
        : true,
    );
    return (teacher as TrackReference | undefined) ?? (cameraTracks[0] as TrackReference | undefined);
  }, [cameraTracks, isTeacher]);

  /* Student tiles: all camera tracks except the one shown on the main stage */
  const studentTracks = useMemo(() => {
    const mainSid = activeScreen
      ? undefined
      : (teacherTrack as TrackReference | undefined)?.participant.sid;
    return cameraTracks.filter(
      (t) => (t as TrackReference).participant.sid !== mainSid,
    ) as TrackReference[];
  }, [cameraTracks, teacherTrack, activeScreen]);

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Main stage */}
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        {activeScreen ? (
          <VideoTrack trackRef={activeScreen} className="w-full h-full object-contain" />
        ) : teacherTrack ? (
          <VideoTrack trackRef={teacherTrack} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <p className="text-sm text-white/60">Waiting for video...</p>
          </div>
        )}
        {activeScreen && (
          <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
            Screen Share
          </span>
        )}
      </div>

      {/* Student tiles — horizontal scroll */}
      {studentTracks.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {studentTracks.map((trackRef) => (
            <div
              key={trackRef.participant.sid}
              className="relative shrink-0 w-28 h-20 sm:w-36 sm:h-24 rounded-lg overflow-hidden bg-muted"
            >
              <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white truncate max-w-[90%]">
                {trackRef.participant.name ?? trackRef.participant.identity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Participant count */}
      <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <UsersIcon className="size-3.5" />
        <span>
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
