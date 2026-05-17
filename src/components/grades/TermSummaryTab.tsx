'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, BookOpen, Settings2, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  useTermSummary,
  type TermSummaryStudentRow,
  type TermSummarySubjectColumn,
  type TermSummaryAssessment,
} from '@/hooks/useTermSummary';
import { SubjectTrendDialog } from './SubjectTrendDialog';
import { StudentTermDetailDialog } from './StudentTermDetailDialog';
import { SubjectWeightingDialog } from './SubjectWeightingDialog';
import { cn } from '@/lib/utils';

type ViewMode = 'totals' | 'tests';

interface Props {
  classId: string;
  // Pass 'year' for the full-year roll-up.
  term: number | 'year';
  academicYear: number;
}

function gradeColor(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground';
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-foreground';
  return 'text-destructive';
}

function deltaIcon(value: number | null, base: number | null) {
  if (value === null || base === null) return null;
  const diff = value - base;
  if (Math.abs(diff) < 1) {
    return <Minus className="h-3 w-3 text-muted-foreground" aria-label="On par with class" />;
  }
  if (diff > 0) {
    return <TrendingUp className="h-3 w-3 text-emerald-600" aria-label={`+${diff.toFixed(1)} vs class`} />;
  }
  return <TrendingDown className="h-3 w-3 text-destructive" aria-label={`${diff.toFixed(1)} vs class`} />;
}

interface SubjectGroup {
  subject: TermSummarySubjectColumn;
  assessments: TermSummaryAssessment[];
}

export function TermSummaryTab({ classId, term, academicYear }: Props) {
  const { summary, loading } = useTermSummary({ classId, term, academicYear });
  const [search, setSearch] = useState('');
  // Default to "totals" — the report-card-style at-a-glance view that's
  // useful for primary teachers with many subjects per class. "Tests" is
  // the detail drill-down.
  const [viewMode, setViewMode] = useState<ViewMode>('totals');
  // Subject filter for Tests view. Empty string = all subjects.
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [studentDrill, setStudentDrill] = useState<{ id: string; name: string } | null>(null);
  const [subjectDrill, setSubjectDrill] = useState<{ id: string; name: string } | null>(null);
  const [weightingSubjectId, setWeightingSubjectId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    if (!summary) return [];
    const q = search.trim().toLowerCase();
    if (!q) return summary.students;
    return summary.students.filter((s) =>
      s.studentName.toLowerCase().includes(q)
      || s.admissionNumber.toLowerCase().includes(q),
    );
  }, [summary, search]);

  // Group assessments by subject for the Tests view, preserving date order.
  const allSubjectGroups = useMemo<SubjectGroup[]>(() => {
    if (!summary) return [];
    const bySubject = new Map<string, TermSummaryAssessment[]>();
    for (const a of summary.assessments) {
      const arr = bySubject.get(a.subjectId) ?? [];
      arr.push(a);
      bySubject.set(a.subjectId, arr);
    }
    return summary.subjects.map((s) => ({
      subject: s,
      assessments: bySubject.get(s.subjectId) ?? [],
    }));
  }, [summary]);

  // Subject filter only applies to Tests view.
  const subjectGroups = useMemo<SubjectGroup[]>(() => {
    if (!subjectFilter) return allSubjectGroups;
    return allSubjectGroups.filter((g) => g.subject.subjectId === subjectFilter);
  }, [allSubjectGroups, subjectFilter]);

  const scopeLabel = useMemo(() => {
    if (!summary) return '';
    if (summary.scope === 'year') return `Full year · ${summary.academicYear}`;
    return `Term ${summary.term} · ${summary.academicYear}`;
  }, [summary]);

  if (loading) return <LoadingSpinner />;
  if (!summary) return null;

  if (summary.subjects.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={`No marks captured ${summary.scope === 'year' ? 'this year' : `for Term ${summary.term}`} yet`}
        description="Use the Enter marks tab to capture results — they'll roll up here automatically."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Class average · {scopeLabel}
              </p>
              <p className={cn(
                'text-4xl font-semibold leading-none mt-1',
                gradeColor(summary.classOverallAverage),
              )}>
                {summary.classOverallAverage !== null
                  ? `${summary.classOverallAverage}%`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.students.length} student{summary.students.length === 1 ? '' : 's'}
                {' · '}{summary.subjects.length} subject{summary.subjects.length === 1 ? '' : 's'}
                {' · '}{summary.assessments.length} test{summary.assessments.length === 1 ? '' : 's'}
              </p>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students…"
              className="w-full sm:w-64"
            />
          </div>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {summary.subjects.map((s) => (
              <SubjectChip
                key={s.subjectId}
                subject={s}
                onOpenTrend={() => setSubjectDrill({ id: s.subjectId, name: s.subjectName })}
                onConfigureWeightings={() => setWeightingSubjectId(s.subjectId)}
              />
            ))}
          </div>

          {/* View toggle + (Tests-only) subject filter. */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="inline-flex rounded-md border bg-muted/20 p-0.5">
              <Button
                type="button"
                variant={viewMode === 'totals' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('totals')}
                className="h-8"
              >
                Totals
              </Button>
              <Button
                type="button"
                variant={viewMode === 'tests' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('tests')}
                className="h-8"
              >
                Tests
              </Button>
            </div>
            {viewMode === 'tests' && summary.subjects.length > 1 && (
              <Select
                value={subjectFilter || 'all'}
                onValueChange={(val: string | null) =>
                  setSubjectFilter(val === 'all' || !val ? '' : val)
                }
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {summary.subjects.map((s) => (
                    <SelectItem key={s.subjectId} value={s.subjectId}>
                      {s.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === 'totals' ? (
            <TotalsTable
              subjects={summary.subjects}
              students={filteredRows}
              onOpenStudent={(id, name) => setStudentDrill({ id, name })}
              onOpenSubject={(id, name) => setSubjectDrill({ id, name })}
            />
          ) : (
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
                          onClick={() => setSubjectDrill({
                            id: g.subject.subjectId,
                            name: g.subject.subjectName,
                          })}
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
                {filteredRows.map((row) => (
                  <StudentRow
                    key={row.studentId}
                    row={row}
                    groups={subjectGroups}
                    onOpen={() =>
                      setStudentDrill({ id: row.studentId, name: row.studentName })
                    }
                  />
                ))}
                {filteredRows.length === 0 && (
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
          )}
        </CardContent>
      </Card>

      <StudentTermDetailDialog
        open={studentDrill !== null}
        onOpenChange={(open) => { if (!open) setStudentDrill(null); }}
        studentId={studentDrill?.id ?? null}
        studentName={studentDrill?.name ?? ''}
        term={term}
        academicYear={academicYear}
      />

      <SubjectTrendDialog
        open={subjectDrill !== null}
        onOpenChange={(open) => { if (!open) setSubjectDrill(null); }}
        classId={classId}
        subjectId={subjectDrill?.id ?? null}
        subjectName={subjectDrill?.name ?? ''}
        academicYear={academicYear}
      />

      <SubjectWeightingDialog
        open={weightingSubjectId !== null}
        onOpenChange={(open) => { if (!open) setWeightingSubjectId(null); }}
        subjectId={weightingSubjectId}
        gradeId={summary.gradeId}
      />
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

function CellMark({
  mark,
  base,
}: {
  mark: { mark: number; total: number; percent: number; isAbsent: boolean } | undefined;
  base: number | null;
}) {
  if (!mark) return <span className="text-xs text-muted-foreground">—</span>;
  if (mark.isAbsent) return <span className="text-xs text-muted-foreground">abs</span>;
  return (
    <div className="inline-flex items-center gap-1">
      <span className={cn('font-medium', gradeColor(mark.percent))}>{mark.percent}%</span>
      {deltaIcon(mark.percent, base)}
    </div>
  );
}

/**
 * Compact "report card" view: student × subject matrix. Each cell holds the
 * student's per-subject weighted average for the current term/year, with the
 * cohort-average delta chip. Final column = student's overall.
 */
function TotalsTable({
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

interface SubjectChipProps {
  subject: TermSummarySubjectColumn;
  onOpenTrend: () => void;
  onConfigureWeightings: () => void;
}

// One subject card. Two surfaces:
//   • Body (clickable) → opens the per-term trend drilldown.
//   • Cog button (top-right) → opens the weightings config.
// When weightings aren't configured, the body's average is replaced with
// a destructive "Set weightings" prompt — there is no flat-average
// fallback by design (school policy must be set first).
function SubjectChip({
  subject, onOpenTrend, onConfigureWeightings,
}: SubjectChipProps) {
  const missing = subject.missingWeighting;
  return (
    <div className={cn(
      'group relative rounded-lg border bg-muted/10 transition-colors',
      missing ? 'border-destructive/40' : 'hover:border-primary/50 hover:bg-muted/30',
    )}>
      <button
        type="button"
        onClick={onOpenTrend}
        className="block w-full text-left px-3 py-2 pr-9"
        aria-label={`View trend for ${subject.subjectName}`}
      >
        <p className="text-sm font-medium truncate">{subject.subjectName}</p>
        {missing ? (
          <div className="mt-1 flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium">Set weightings</span>
          </div>
        ) : (
          <div className="mt-1 flex items-baseline gap-1">
            <span className={cn('text-xl font-semibold', gradeColor(subject.classAverage))}>
              {subject.classAverage !== null ? `${subject.classAverage}%` : '—'}
            </span>
            <span className="text-xs text-muted-foreground">class avg</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {subject.studentsWithMarks} marked · {subject.assessmentCount} test{subject.assessmentCount === 1 ? '' : 's'}
        </p>
      </button>
      <button
        type="button"
        onClick={onConfigureWeightings}
        className={cn(
          'absolute top-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted',
          missing
            ? 'text-destructive opacity-100'
            : 'text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        )}
        title="Configure weightings"
        aria-label={`Configure weightings for ${subject.subjectName}`}
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export type { TermSummaryStudentRow };
