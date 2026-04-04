'use client';

import { VideoIcon, UsersIcon } from 'lucide-react';
import type { VirtualSession } from '@/types';

interface VideoRoomProps {
  session: VirtualSession;
  isTeacher: boolean;
  participantCount?: number;
}

export function VideoRoom({ session, isTeacher, participantCount = 0 }: VideoRoomProps) {
  const teacherName = `${session.teacherId.firstName} ${session.teacherId.lastName}`;

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-80 rounded-xl border-2 border-dashed border-muted bg-muted/20 p-6 text-center gap-4">
      <div className="rounded-full bg-muted p-5">
        <VideoIcon className="size-10 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold truncate max-w-xs sm:max-w-sm">{session.title}</h3>
        <p className="text-sm text-muted-foreground">
          {session.subjectId.name} · {session.classId.name}
        </p>
        {isTeacher ? (
          <p className="text-xs text-muted-foreground">You are hosting this session</p>
        ) : (
          <p className="text-xs text-muted-foreground">Hosted by {teacherName}</p>
        )}
      </div>

      <div className="rounded-lg border bg-card px-4 py-2 text-sm text-muted-foreground">
        Video feed placeholder — integrate LiveKit React SDK
      </div>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <UsersIcon className="size-4" />
        <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
