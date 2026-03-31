'use client';

import { Badge } from '@/components/ui/badge';
import { EVENT_TYPE_LABELS, EVENT_TYPE_STYLES } from './types';
import type { EventType } from './types';

interface EventTypeBadgeProps {
  eventType: EventType;
}

export function EventTypeBadge({ eventType }: EventTypeBadgeProps) {
  return (
    <Badge className={EVENT_TYPE_STYLES[eventType] ?? ''}>
      {EVENT_TYPE_LABELS[eventType] ?? eventType}
    </Badge>
  );
}
