'use client';

import { CalendarCheck, Clock, MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MeetingDay, MeetingDayStats } from '@/types';

interface Props {
  day: MeetingDay;
  stats?: MeetingDayStats;
  onManage?: () => void;
}

export function MeetingDayCard({ day, stats, onManage }: Props) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate">{day.name}</span>
          {day.virtualMeetingEnabled && <Badge variant="secondary">Virtual</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarCheck className="h-4 w-4 shrink-0" />
          <span>{day.date}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{day.startTime} – {day.endTime} ({day.slotDuration} min slots)</span>
        </div>
        {day.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{day.location}</span>
          </div>
        )}
        {stats && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">{stats.booked} booked</Badge>
            <Badge variant="outline">{stats.available} available</Badge>
            <Badge variant="secondary">{stats.total} total</Badge>
          </div>
        )}
        {onManage && (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={onManage}>
            <Settings className="mr-1 h-3.5 w-3.5" />Manage
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
