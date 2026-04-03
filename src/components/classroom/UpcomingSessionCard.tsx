'use client';

import { VideoIcon, CircleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SessionStatusBadge } from './SessionStatusBadge';
import type { VirtualSession } from '@/types';

interface UpcomingSessionCardProps {
  session: VirtualSession;
  onJoin?: () => void;
  onStart?: () => void;
}

function formatDateTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const dateStr = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const startTime = s.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const endTime = e.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} · ${startTime} – ${endTime}`;
}

export function UpcomingSessionCard({ session, onJoin, onStart }: UpcomingSessionCardProps) {
  const teacherName = `${session.teacherId.firstName} ${session.teacherId.lastName}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="truncate text-base">{session.title}</CardTitle>
          <SessionStatusBadge status={session.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <span>
            <span className="font-medium text-foreground">Subject:</span>{' '}
            {session.subjectId.name}
          </span>
          <span>
            <span className="font-medium text-foreground">Class:</span>{' '}
            {session.classId.name}
          </span>
          <span>
            <span className="font-medium text-foreground">Teacher:</span>{' '}
            {teacherName}
          </span>
          <span className="truncate">{formatDateTimeRange(session.scheduledStart, session.scheduledEnd)}</span>
        </div>

        {session.isRecorded && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleIcon className="size-3 text-destructive" />
            Session will be recorded
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {onStart && session.status === 'scheduled' && (
            <Button size="default" onClick={onStart} className="w-full sm:w-auto">
              <VideoIcon className="mr-1.5 size-4" />
              Start Session
            </Button>
          )}
          {onJoin && session.status === 'live' && (
            <Button size="default" onClick={onJoin} className="w-full sm:w-auto">
              <VideoIcon className="mr-1.5 size-4" />
              Join Session
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
