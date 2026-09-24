import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Teacher-facing files already on semantic tokens. Add a file here when its page is migrated (plan 1B). */
const MIGRATED = [
  'src/components/shared/StatusChip.tsx',
  'src/components/shared/StatCard.tsx',
  'src/components/shared/PageHeader.tsx',
  'src/components/shared/EmptyState.tsx',
  'src/components/shared/ModuleOffState.tsx',
  'src/components/students/LearnerQuickStats.tsx',
  'src/app/(dashboard)/teacher/students/[id]/page.tsx',
  'src/app/(dashboard)/teacher/policies/[id]/page.tsx',
  'src/components/hod/RequestChangesDialog.tsx',
  'src/components/hod/ModerationQueueTable.tsx',
  'src/components/teacher-home/YourDayCard.tsx',
  'src/components/teacher-home/NeedsYouCard.tsx',
  'src/components/teacher-home/AIQuickMakeHero.tsx',
  'src/app/(dashboard)/teacher/page.tsx',
  'src/components/lessons/LessonMaterialCard.tsx',
  'src/components/lessons/lesson-calendar.utils.ts',
  'src/components/lessons/LessonAssignedClasses.tsx',
  'src/components/lessons/LessonGenerateAllBanner.tsx',
  'src/components/lessons/LessonHeader.tsx',
  'src/components/homework/ExerciseQuestionsList.tsx',
  'src/app/(dashboard)/teacher/assignments/new/_StepSetup.tsx',
  'src/components/attendance/AttendanceTodayTab.tsx',
  'src/components/attendance/StatusButton.tsx',
  'src/components/attendance/AttendanceStatusBadge.tsx',
  'src/components/attendance/AttendanceHistoryTab.tsx',
  'src/components/attendance/DisciplineTable.tsx',
  'src/components/attendance/StudentRow.tsx',
  'src/components/attendance/ChronicAbsenteeTable.tsx',
  'src/components/attendance/AttendanceBulkMarkMenu.tsx',
  'src/components/timetable/timetable-helpers.ts',
  'src/components/timetable/PeriodConfigDialog.tsx',
  'src/components/grades/TermSummaryHelpers.tsx',
  'src/components/grades/StudentTermDetailDialog.tsx',
  'src/components/grades/StudentHistoryDialog.tsx',
  'src/app/(dashboard)/teacher/grades/page.tsx',
  'src/components/papers/paper-wizard-helpers.ts',
  'src/app/(dashboard)/teacher/papers/new/_indicators.tsx',
  'src/components/reports/ReportCardTable.tsx',
  'src/components/workbench/planner/WeightingSidebar.tsx',
  'src/app/(dashboard)/teacher/workbench/planner/page.tsx',
  'src/components/classes/StudentAddCredentialsResults.tsx',
  'src/components/grades/TermSummarySubjectChip.tsx',
];

const RAW = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|decoration)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g;

describe('teacher colour guard', () => {
  it.each(MIGRATED)('%s uses only semantic colour tokens', (file) => {
    const source = readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    expect(source.match(RAW) ?? []).toEqual([]);
  });

  it('catches a raw palette class', () => {
    expect('className="text-red-500 bg-emerald-50"'.match(RAW)).toEqual(['text-red-500', 'bg-emerald-50']);
  });
});
