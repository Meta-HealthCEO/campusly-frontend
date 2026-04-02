'use client';

import { useState, useEffect } from 'react';
import { CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TeacherScheduleView } from '@/components/meetings/TeacherScheduleView';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useMeetings } from '@/hooks/useMeetings';

export default function TeacherMeetingsPage() {
  const {
    meetingDays, teacherSlots, loading,
    loadMeetingDays, loadTeacherSlots, markComplete,
  } = useMeetings();

  const [selectedDayId, setSelectedDayId] = useState('');

  useEffect(() => {
    loadMeetingDays();
  }, [loadMeetingDays]);

  useEffect(() => {
    loadTeacherSlots(selectedDayId || undefined);
  }, [selectedDayId, loadTeacherSlots]);

  const handleComplete = async (slotId: string, notes?: string) => {
    await markComplete(slotId, notes);
    loadTeacherSlots(selectedDayId || undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Meetings" description="View and manage your parent-teacher meeting slots" />

      {loading && <LoadingSpinner />}

      {!loading && (
        <>
          <div className="space-y-2">
            <Label>Meeting Day</Label>
            <Select
              value={selectedDayId || 'all'}
              onValueChange={(val: unknown) => setSelectedDayId((val as string) === 'all' ? '' : val as string)}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="All meeting days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All meeting days</SelectItem>
                {meetingDays.map((day) => (
                  <SelectItem key={day.id} value={day.id}>
                    {day.name} — {day.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {teacherSlots.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No meeting slots"
              description="You don't have any meeting slots assigned yet. Contact your admin."
            />
          ) : (
            <TeacherScheduleView slots={teacherSlots} onComplete={handleComplete} />
          )}
        </>
      )}
    </div>
  );
}
