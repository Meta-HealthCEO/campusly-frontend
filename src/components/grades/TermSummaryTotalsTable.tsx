'use client';

import { cn } from '@/lib/utils';
import { gradeColor, deltaIcon } from './TermSummaryHelpers';
import type {
  TermSummaryStudentRow,
  TermSummarySubjectColumn,
} from '@/hooks/useTermSummary';

/**
 * Compact "report card" view: student × subject matrix. Each cell holds the
 * student's per-subject weighted average for the current term/year, with the
 * cohort-average delta chip. Final column = student's overall.
 */
export function TermSummaryTotalsTable({
  subjects,
  students,
  onOpenStudent,
  onOpenSubject,
}: {
  subjects: TermSummarySubjectColumn[];
  students: TermSummaryStudentRow[];
  onOpenStudent: (id: string, name: string) => void;
  onOpenSubject: (id: string, name: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full w-auto text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-muted/30">
            <th className="sticky left-0 z-10 bg-muted/30 px-4 py-2 text-left font-medium text-muted-foreground border-b w-64">
              Student
            </th>
            {subjects.map((s) => (
              <th
                key={s.subjectId}
                className="px-3 py-2 text-center font-medium text-foreground border-b border-l whitespace-nowrap"
              >
                <button
                  type="button"
                  onClick={() => onOpenSubject(s.subjectId, s.subjectName)}
                  className="hover:underline"
                >
                  {s.subjectName}
                </button>
                <div className="text-[10px] font-normal text-muted-foreground">
                  {s.assessmentCount} test{s.assessmentCount === 1 ? '' : 's'}
                </div>
              </th>
            ))}
            <th className="sticky right-0 z-10 bg-muted/30 px-3 py-2 text-center font-semibold text-foreground border-b border-l whitespace-nowrap">
              Overall
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((row) => (
            <tr
              key={row.studentId}
              className="hover:bg-muted/20 cursor-pointer"
              onClick={() => onOpenStudent(row.studentId, row.studentName)}
            >
              <td className="sticky left-0 z-10 bg-background px-4 py-2 border-b w-64">
                <div className="font-medium hover:underline truncate">{row.studentName}</div>
                {row.admissionNumber && (
                  <div className="text-xs text-muted-foreground truncate">{row.admissionNumber}</div>
                )}
              </td>
              {subjects.map((s) => {
                const value = row.subjectAverages[s.subjectId] ?? null;
                return (
                  <td
                    key={s.subjectId}
                    className="px-3 py-2 text-center border-b border-l whitespace-nowrap"
                  >
                    {value === null ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <span className={cn('font-medium', gradeColor(value))}>{value}%</span>
                        {deltaIcon(value, s.classAverage)}
                      </div>
                    )}
                  </td>
                );
              })}
              <td className="sticky right-0 z-10 bg-background px-3 py-2 text-center border-b border-l whitespace-nowrap">
                <span className={cn('font-semibold', gradeColor(row.overallAverage))}>
                  {row.overallAverage !== null ? `${row.overallAverage}%` : '—'}
                </span>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td
                colSpan={subjects.length + 2}
                className="px-4 py-6 text-center text-sm text-muted-foreground"
              >
                No students match this search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
