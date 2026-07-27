'use client';

import { cn } from '@/lib/utils';
import { gradeColor, CellMark, type SubjectGroup } from './TermSummaryHelpers';
import type { TermSummaryStudentRow } from '@/hooks/useTermSummary';

interface TermSummaryTestsTableProps {
  subjectGroups: SubjectGroup[];
  students: TermSummaryStudentRow[];
  onOpenStudent: (id: string, name: string) => void;
  onOpenSubject: (id: string, name: string) => void;
}

/** Detail drill-down view: one column per assessment, grouped by subject. */
export function TermSummaryTestsTable({
  subjectGroups,
  students,
  onOpenStudent,
  onOpenSubject,
}: TermSummaryTestsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full w-auto text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-muted/30">
            <th className="sticky left-0 z-10 bg-muted/30 px-4 py-2 text-left font-medium text-muted-foreground border-b w-64">
              Student
            </th>
            {subjectGroups.flatMap((g) => {
              // When there's only one subject in the whole view, the
              // subject label on every column header is noise — it's
              // already on the chip above. Hide it in that case.
              const showSubjectLabel = subjectGroups.length > 1;
              const headers: React.ReactNode[] = g.assessments.map((a) => (
                <th
                  key={a.assessmentId}
                  className="px-3 py-2 text-center font-medium text-foreground border-b border-l whitespace-nowrap"
                  title={`${g.subject.subjectName} · ${a.name}`}
                >
                  {showSubjectLabel && (
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {g.subject.subjectName}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenSubject(g.subject.subjectId, g.subject.subjectName)}
                    className="max-w-32 truncate hover:underline block mx-auto"
                  >
                    {a.name}
                  </button>
                  <div className="text-[10px] font-normal text-muted-foreground">
                    T{a.term} · /{a.totalMarks}
                  </div>
                </th>
              ));
              if (g.assessments.length > 1) {
                headers.push(
                  <th
                    key={`${g.subject.subjectId}-avg`}
                    className="px-3 py-2 text-center font-medium text-muted-foreground border-b border-l bg-muted/40 whitespace-nowrap"
                  >
                    {showSubjectLabel && (
                      <div className="text-[10px] font-semibold uppercase tracking-wide">
                        {g.subject.subjectName}
                      </div>
                    )}
                    <div className="text-foreground">Subject avg</div>
                  </th>,
                );
              }
              return headers;
            })}
            <th className="sticky right-0 z-10 bg-muted/30 px-3 py-2 text-center font-semibold text-foreground border-b border-l whitespace-nowrap">
              Overall
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((row) => (
            <StudentRow
              key={row.studentId}
              row={row}
              groups={subjectGroups}
              onOpen={() => onOpenStudent(row.studentId, row.studentName)}
            />
          ))}
          {students.length === 0 && (
            <tr>
              <td
                colSpan={2 + subjectGroups.reduce(
                  (sum, g) => sum + g.assessments.length + (g.assessments.length > 1 ? 1 : 0),
                  0,
                )}
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

interface StudentRowProps {
  row: TermSummaryStudentRow;
  groups: SubjectGroup[];
  onOpen: () => void;
}

function StudentRow({ row, groups, onOpen }: StudentRowProps) {
  return (
    <tr
      className="hover:bg-muted/20 cursor-pointer"
      onClick={onOpen}
    >
      <td className="sticky left-0 z-10 bg-background px-4 py-2 border-b w-64">
        <div className="font-medium hover:underline truncate">{row.studentName}</div>
        {row.admissionNumber && (
          <div className="text-xs text-muted-foreground truncate">{row.admissionNumber}</div>
        )}
      </td>
      {groups.flatMap((g) => {
        const cells: React.ReactNode[] = g.assessments.map((a) => {
          const m = row.marksByAssessment[a.assessmentId];
          return (
            <td
              key={a.assessmentId}
              className="px-3 py-2 text-center whitespace-nowrap border-b border-l"
            >
              <CellMark mark={m} base={a.classAverage} />
            </td>
          );
        });
        if (g.assessments.length > 1) {
          const subjectAvg = row.subjectAverages[g.subject.subjectId] ?? null;
          cells.push(
            <td
              key={`${g.subject.subjectId}-avg`}
              className="px-3 py-2 text-center border-b border-l bg-muted/10 whitespace-nowrap"
            >
              <span className={cn('font-semibold', gradeColor(subjectAvg))}>
                {subjectAvg !== null ? `${subjectAvg}%` : '—'}
              </span>
            </td>,
          );
        }
        return cells;
      })}
      <td className="sticky right-0 z-10 bg-background px-3 py-2 text-center border-b border-l whitespace-nowrap">
        <span className={cn('font-semibold', gradeColor(row.overallAverage))}>
          {row.overallAverage !== null ? `${row.overallAverage}%` : '—'}
        </span>
      </td>
    </tr>
  );
}
