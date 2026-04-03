'use client';

import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, GraduationCap, User } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  isTeacher: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface ParticipantGridProps {
  participants: Participant[];
}

function ParticipantCard({ participant }: { participant: Participant }) {
  const initials = participant.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-3">
      {/* Avatar placeholder */}
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-lg font-semibold text-muted-foreground">
        {initials}
      </div>

      <p className="text-xs font-medium truncate w-full text-center">{participant.name}</p>

      <Badge
        variant={participant.isTeacher ? 'default' : 'secondary'}
        className="flex items-center gap-1 text-xs px-1.5 py-0"
      >
        {participant.isTeacher ? (
          <GraduationCap className="h-3 w-3" />
        ) : (
          <User className="h-3 w-3" />
        )}
        {participant.isTeacher ? 'Teacher' : 'Student'}
      </Badge>

      <div className="flex items-center gap-2">
        {participant.hasVideo ? (
          <Video className="h-4 w-4 text-emerald-600" />
        ) : (
          <VideoOff className="h-4 w-4 text-muted-foreground" />
        )}
        {participant.hasAudio ? (
          <Mic className="h-4 w-4 text-emerald-600" />
        ) : (
          <MicOff className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export function ParticipantGrid({ participants }: ParticipantGridProps) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No participants yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {participants.map((p) => (
        <ParticipantCard key={p.id} participant={p} />
      ))}
    </div>
  );
}
