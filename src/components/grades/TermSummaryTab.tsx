'use client';

import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
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
} from '@/hooks/useTermSummary';
import { SubjectTrendDialog } from './SubjectTrendDialog';
import { StudentTermDetailDialog } from './StudentTermDetailDialog';
import { SubjectWeightingDialog } from './SubjectWeightingDialog';
import { gradeColor, type SubjectGroup } from './TermSummaryHelpers';
import { TermSummaryTotalsTable } from './TermSummaryTotalsTable';
import { TermSummaryTestsTable } from './TermSummaryTestsTable';
import { TermSummarySubjectChip } from './TermSummarySubjectChip';
import { cn } from '@/lib/utils';

type ViewMode = 'totals' | 'tests';

interface Props {
  classId: string;
  // Pass 'year' for the full-year roll-up.
  term: number | 'year';
  academicYear: number;
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
    const bySubject = new Map<string, SubjectGroup['assessments']>();
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
              <TermSummarySubjectChip
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
            <TermSummaryTotalsTable
              subjects={summary.subjects}
              students={filteredRows}
              onOpenStudent={(id, name) => setStudentDrill({ id, name })}
              onOpenSubject={(id, name) => setSubjectDrill({ id, name })}
            />
          ) : (
            <TermSummaryTestsTable
              subjectGroups={subjectGroups}
              students={filteredRows}
              onOpenStudent={(id, name) => setStudentDrill({ id, name })}
              onOpenSubject={(id, name) => setSubjectDrill({ id, name })}
            />
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

export type { TermSummaryStudentRow };
