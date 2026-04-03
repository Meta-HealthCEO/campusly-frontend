'use client';

import { Badge } from '@/components/ui/badge';
import type { SessionStatus } from '@/types';

interface SessionStatusBadgeProps {
  status: SessionStatus;
}

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  if (status === 'live') {
    return (
      <Badge variant="default" className="gap-1.5 bg-green-600 text-white hover:bg-green-600">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-white" />
        </span>
        Live
      </Badge>
    );
  }

  if (status === 'scheduled') {
    return <Badge variant="secondary">Scheduled</Badge>;
  }

  if (status === 'ended') {
    return <Badge variant="outline">Ended</Badge>;
  }

  return <Badge variant="destructive">Cancelled</Badge>;
}
