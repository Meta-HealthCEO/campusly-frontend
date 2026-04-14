'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { TableSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, Printer, Settings } from 'lucide-react';
import { useTeacherTimetableManager } from '@/hooks/useTeacherTimetableManager';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { TimetableMobileView } from '@/components/timetable/TimetableMobileView';
import { resolveId } from '@/components/timetable/timetable-helpers';
import { PeriodConfigDialog } from '@/components/timetable/PeriodConfigDialog';
import { TimetableSlotDialog } from '@/components/timetable/TimetableSlotDialog';
import type { TimetableSlot, DayOfWeek } from '@/types';
import type { CreateSlotPayload } from '@/hooks/useTeacherTimetableManager';

interface SlotDialogState {
  open: boolean;
  day: DayOfWeek;
  period: number;
  slot: TimetableSlot | null;
}

export default function TeacherTimetablePage() {
  const {
    timetable, loading, config, configLoading, hasConfig,
    configError, retryConfig,
    saveConfig, createSlot, updateSlot, deleteSlot,
  } = useTeacherTimetableManager();

  const { subjects, loading: subjectsLoading } = useTeacherSubjects();
  const { classes, loading: classesLoading } = useTeacherClasses();

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
      const slot = timetable.find((s: TimetableSlot) => s.id === id);
      const slotData: CreateSlotPayload | undefined = slot ? {
        day: slot.day,
        period: slot.period,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subjectId: resolveId(slot.subjectId),
        classId: resolveId(slot.classId),
        room: slot.room,
      } : undefined;
      await deleteSlot(id, slotData);
      setSlotDialog((prev) => ({ ...prev, open: false }));
    },
    [timetable, deleteSlot],
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

  // Config error
  if (configError) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule" />
        <EmptyState
          icon={AlertCircle}
          title="Could not load configuration"
          description="There was a problem loading your timetable settings. Please try again."
          action={<Button onClick={retryConfig}>Retry</Button>}
        />
      </div>
    );
  }

  // No config yet -- prompt teacher to configure periods
  if (!hasConfig) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule" />
        <EmptyState
          icon={Calendar}
          title="No period configuration"
          description="Set up your school's period times before building your timetable."
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
          maxExistingPeriod={maxExistingPeriod}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule">
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Period Settings
            </Button>
          </div>
        </PageHeader>

        {/* Desktop grid */}
        <div className="hidden lg:block print:block">
          <TimetableGrid
            config={config!}
            timetable={timetable}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Mobile view */}
        <div className="lg:hidden print:hidden">
          <TimetableMobileView
            config={config!}
            timetable={timetable}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Dialogs */}
        <div className="print:hidden">
        <PeriodConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          config={config}
          onSave={saveConfig}
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
          subjectsLoading={subjectsLoading}
          classesLoading={classesLoading}
          existingSlot={slotDialog.slot}
          onSave={handleSlotSave}
          onUpdate={handleSlotUpdate}
          onDelete={handleSlotDelete}
        />
        </div>
      </div>
    </ErrorBoundary>
  );
}
