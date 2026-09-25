'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { contextEyebrow, sectionEyebrow } from '@/lib/eyebrow';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3, BookOpen } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useTeacherAttendance } from '@/hooks/useTeacherAttendance';
import { AttendanceClassPicker } from '@/components/attendance/AttendanceClassPicker';
import { AttendanceTodayTab } from '@/components/attendance/AttendanceTodayTab';
import { AttendanceHistoryTab } from '@/components/attendance/AttendanceHistoryTab';
import { AttendanceExportButton } from '@/components/attendance/AttendanceExportButton';
import { toISODate } from '@/lib/utils';
import Link from 'next/link';
import { useIsStandalone } from '@/hooks/useIsStandalone';

type AttendanceView = 'today' | 'history';

function isView(value: string | null): value is AttendanceView {
  return value === 'today' || value === 'history';
}

function initialHistoryRange(): { from: string; to: string } {
  const ref = new Date();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { from: toISODate(monday), to: toISODate(friday) };
}

export default function TeacherAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Standalone teachers know this page as their Register (their nav item).
  const title = useIsStandalone() ? 'Register' : 'Attendance';
  const initialTab: AttendanceView = isView(searchParams.get('tab')) ? (searchParams.get('tab') as AttendanceView) : 'today';

  const [view, setView] = useState<AttendanceView>(initialTab);
  const [historyRange, setHistoryRange] = useState(initialHistoryRange);

  const hook = useTeacherAttendance({ search: searchParams });

  // Sync URL when class or tab changes — replace (no history entries).
  useEffect(() => {
    if (!hook.selectedClass) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('classId', hook.selectedClass.id);
    params.set('tab', view);
    router.replace(`/teacher/attendance?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.selectedClass?.id, view]);

  // Stable callback so AttendanceHistoryTab's useEffect doesn't loop.
  const handleHistoryRange = useCallback((from: string, to: string) => {
    setHistoryRange({ from, to });
  }, []);

  // PDF export scope: today tab = the single selected date; history tab =
  // whatever range the History component reports via onRangeChange.
  const exportScope = useMemo(() => {
    if (view === 'today') {
      return {
        dateFrom: hook.selectedDate,
        dateTo: hook.selectedDate,
        filename: `register-${hook.selectedDate}.pdf`,
      };
    }
    return {
      dateFrom: historyRange.from,
      dateTo: historyRange.to,
      filename: `register-${historyRange.from}-to-${historyRange.to}.pdf`,
    };
  }, [view, hook.selectedDate, historyRange]);

  if (hook.loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={sectionEyebrow('Class')} title={title} description="Mark daily attendance for any of your classes" />
        <LoadingSpinner />
      </div>
    );
  }

  if (hook.classes.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={sectionEyebrow('Class')} title={title} />
        <EmptyState
          icon={BookOpen}
          title="No classes yet"
          description="You have no classes yet. Create one in the Classes section first."
          action={<Link href="/teacher/classes" className="text-primary underline">Open Classes →</Link>}
        />
      </div>
    );
  }

  const classLabel = hook.selectedClass?.label ?? '';

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={contextEyebrow([classLabel.split(' · ')[0], `Period ${hook.period}`], 'Class')}
        title={title}
        description={classLabel}
      >
        <AttendanceClassPicker
          classes={hook.classes}
          value={hook.selectedClass?.id ?? null}
          onChange={(id) => { void hook.changeClass(id); }}
        />
        <AttendanceExportButton
          classId={hook.selectedClass?.id ?? null}
          period={hook.period}
          dateFrom={exportScope.dateFrom}
          dateTo={exportScope.dateTo}
          filename={exportScope.filename}
        />
        <Link href={ROUTES.TEACHER_ATTENDANCE_REPORT} className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Report
        </Link>
      </PageHeader>

      <Tabs value={view} onValueChange={(v: unknown) => { if (isView(v as string)) setView(v as AttendanceView); }}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <AttendanceTodayTab
            students={hook.students}
            selectedDate={hook.selectedDate}
            period={hook.period}
            attendance={hook.attendance}
            existingLoaded={hook.existingLoaded}
            loadError={hook.loadError}
            saving={hook.saving}
            saved={hook.saved}
            dirty={hook.dirty}
            onChangeDate={hook.changeDate}
            onSetPeriod={hook.setPeriod}
            onUpdateStatus={hook.updateStatus}
            onUpdateNote={hook.updateNote}
            onMarkAll={hook.markAll}
            onSave={hook.saveAttendance}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <AttendanceHistoryTab
            classId={hook.selectedClass?.id ?? null}
            period={hook.period}
            students={hook.students}
            onSetPeriod={hook.setPeriod}
            onRangeChange={handleHistoryRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
