'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreateMeetingDayDialog } from '@/components/meetings/CreateMeetingDayDialog';
import { MeetingDayCard } from '@/components/meetings/MeetingDayCard';
import { SlotGeneratorDialog } from '@/components/meetings/SlotGeneratorDialog';
import { AvailableSlotsList } from '@/components/meetings/AvailableSlotsList';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useMeetings } from '@/hooks/useMeetings';
import { useStaff } from '@/hooks/useStaff';
import type { MeetingDay, MeetingDayStats } from '@/types';

export default function AdminMeetingsPage() {
  const {
    meetingDays, loading, loadMeetingDays, createMeetingDay,
    generateSlots, loadAvailableSlots, availableSlots, loadStats,
  } = useMeetings();
  const { staffList, fetchStaff } = useStaff();

  const [createOpen, setCreateOpen] = useState(false);
  const [managingDay, setManagingDay] = useState<MeetingDay | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [statsMap, setStatsMap] = useState<Record<string, MeetingDayStats>>({});

  useEffect(() => {
    loadMeetingDays();
    fetchStaff();
  }, [loadMeetingDays, fetchStaff]);

  const loadAllStats = useCallback(async () => {
    const map: Record<string, MeetingDayStats> = {};
    for (const day of meetingDays) {
      const s = await loadStats(day.id);
      if (s) map[day.id] = s;
    }
    setStatsMap(map);
  }, [meetingDays, loadStats]);

  useEffect(() => {
    if (meetingDays.length > 0) loadAllStats();
  }, [meetingDays, loadAllStats]);

  const handleCreate = async (payload: Parameters<typeof createMeetingDay>[0]) => {
    await createMeetingDay(payload);
    await loadMeetingDays();
  };

  const handleManage = (day: MeetingDay) => {
    setManagingDay(day);
    loadAvailableSlots(day.id);
  };

  const handleGenerate = async (meetingDayId: string, teacherId: string, teacherName: string) => {
    await generateSlots(meetingDayId, teacherId, teacherName);
    if (managingDay) loadAvailableSlots(managingDay.id);
    await loadMeetingDays();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Parent-Teacher Meetings" description="Create and manage meeting days">
        <CreateMeetingDayDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
      </PageHeader>

      {loading && <LoadingSpinner />}

      {!loading && meetingDays.length === 0 && (
        <EmptyState
          icon={CalendarCheck}
          title="No meeting days"
          description="Create your first parent-teacher meeting day to get started."
        />
      )}

      {!loading && meetingDays.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {meetingDays.map((day) => (
            <MeetingDayCard
              key={day.id}
              day={day}
              stats={statsMap[day.id]}
              onManage={() => handleManage(day)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!managingDay} onOpenChange={(o) => { if (!o) setManagingDay(null); }}>
        <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{managingDay?.name} — Slots</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="flex justify-end">
              {managingDay && (
                <SlotGeneratorDialog
                  open={genOpen}
                  onOpenChange={setGenOpen}
                  meetingDay={managingDay}
                  teachers={staffList}
                  onGenerate={handleGenerate}
                />
              )}
            </div>
            <AvailableSlotsList slots={availableSlots} onBook={() => {}} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
