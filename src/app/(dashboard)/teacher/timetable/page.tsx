'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { TableSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Calendar, Settings } from 'lucide-react';
import { useTeacherTimetableManager } from '@/hooks/useTeacherTimetableManager';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { TimetableMobileView } from '@/components/timetable/TimetableMobileView';
import { PeriodConfigDialog } from '@/components/timetable/PeriodConfigDialog';
import { TimetableSlotDialog } from '@/components/timetable/TimetableSlotDialog';
import type { TimetableSlot } from '@/types';
import type { CreateSlotPayload } from '@/hooks/useTeacherTimetableManager';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

interface SlotDialogState {
  open: boolean;
  day: DayOfWeek;
  period: number;
  slot: TimetableSlot | null;
}

export default function TeacherTimetablePage() {
  const {
    timetable, loading, config, configLoading, hasConfig,
    saveConfig, createSlot, updateSlot, deleteSlot,
  } = useTeacherTimetableManager();

  const { subjects } = useTeacherSubjects();
  const { classes } = useTeacherClasses();

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [slotDialog, setSlotDialog] = useState<SlotDialogState>({
    open: false,
    day: 'monday',
    period: 1,
    slot: null,
  });

  const maxExistingPeriod = useMemo(
    () => Math.max(0, ...timetable.map((s: TimetableSlot) => s.period)),
    [timetable],
  );

  const periodTime = useMemo(
    () => config?.periodTimes.find((pt) => pt.period === slotDialog.period) ?? null,
    [config, slotDialog.period],
  );

  const handleSlotClick = useCallback(
    (day: DayOfWeek, period: number, slot: TimetableSlot | null) => {
      setSlotDialog({ open: true, day, period, slot });
    },
    [],
  );

  const handleSlotSave = useCallback(
    async (data: CreateSlotPayload) => {
      await createSlot(data);
      setSlotDialog((prev) => ({ ...prev, open: false }));
    },
    [createSlot],
  );

  const handleSlotUpdate = useCallback(
    async (id: string, data: Partial<CreateSlotPayload>) => {
      await updateSlot(id, data);
      setSlotDialog((prev) => ({ ...prev, open: false }));
    },
    [updateSlot],
  );

  const handleSlotDelete = useCallback(
    async (id: string) => {
      await deleteSlot(id);
      setSlotDialog((prev) => ({ ...prev, open: false }));
    },
    [deleteSlot],
  );

  // Loading state
  if (loading || configLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule" />
        <TableSkeleton rows={7} columns={6} />
      </div>
    );
  }

  // No config yet — prompt teacher to configure periods
  if (!hasConfig) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule" />
        <EmptyState
          icon={Calendar}
          title="No period configuration"
          description="Set up your school&apos;s period times before building your timetable."
          action={
            <Button onClick={() => setConfigDialogOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Configure Periods
            </Button>
          }
        />
        <PeriodConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          config={config}
          onSave={saveConfig}
          existingSlotCount={timetable.length}
          maxExistingPeriod={maxExistingPeriod}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Timetable" description="Your weekly teaching schedule">
        <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Period Settings
        </Button>
      </PageHeader>

      {/* Desktop grid */}
      <div className="hidden lg:block">
        <TimetableGrid
          config={config!}
          timetable={timetable}
          onSlotClick={handleSlotClick}
        />
      </div>

      {/* Mobile view */}
      <div className="lg:hidden">
        <TimetableMobileView
          config={config!}
          timetable={timetable}
          onSlotClick={handleSlotClick}
        />
      </div>

      {/* Dialogs */}
      <PeriodConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        config={config}
        onSave={saveConfig}
        existingSlotCount={timetable.length}
        maxExistingPeriod={maxExistingPeriod}
      />

      <TimetableSlotDialog
        open={slotDialog.open}
        onOpenChange={(open: boolean) => setSlotDialog((prev) => ({ ...prev, open }))}
        day={slotDialog.day}
        period={slotDialog.period}
        periodTime={periodTime}
        subjects={subjects}
        classes={classes}
        existingSlot={slotDialog.slot}
        onSave={handleSlotSave}
        onUpdate={handleSlotUpdate}
        onDelete={handleSlotDelete}
      />
    </div>
  );
}
