'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, MapPin, Eye, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { SgbMeeting, SgbMeetingStatus, SgbMeetingType } from '@/types';

interface MeetingListProps {
  meetings: SgbMeeting[];
  isAdmin: boolean;
  onView: (meeting: SgbMeeting) => void;
  onDelete?: (id: string) => void;
}

const STATUS_VARIANT: Record<SgbMeetingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  scheduled: 'default',
  in_progress: 'secondary',
  completed: 'outline',
  cancelled: 'destructive',
};

const TYPE_LABEL: Record<SgbMeetingType, string> = {
  ordinary: 'Ordinary',
  special: 'Special',
  annual_general: 'AGM',
};

export function MeetingList({ meetings, isAdmin, onView, onDelete }: MeetingListProps) {
  if (meetings.length === 0) {
    return <EmptyState icon={CalendarDays} title="No meetings" description="No SGB meetings have been scheduled yet." />;
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <Card key={meeting.id} className="hover:bg-muted/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium truncate">{meeting.title}</h3>
                  <Badge variant={STATUS_VARIANT[meeting.status]}>{meeting.status.replace('_', ' ')}</Badge>
                  <Badge variant="outline">{TYPE_LABEL[meeting.type]}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(meeting.date), 'dd MMM yyyy, HH:mm')}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{meeting.venue}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => onView(meeting)}>
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
                {isAdmin && onDelete && (
                  <Button size="sm" variant="outline" onClick={() => onDelete(meeting.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
