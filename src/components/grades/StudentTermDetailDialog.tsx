'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, YAxis, XAxis, Tooltip,
} from 'recharts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AlertTriangle } from 'lucide-react';
import { useStudentTermDetail, type StudentTermDetailSubject } from '@/hooks/useStudentTermDetail';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName: string;
  // Pass 'year' for the full-year drill-down.
  term: number | 'year';
  academicYear: number;
}

function gradeColor(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground';
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-foreground';
  return 'text-destructive';
}

export function StudentTermDetailDialog({
  open, onOpenChange, studentId, studentName, term, academicYear,
}: Props) {
  const { detail, loading } = useStudentTermDetail({
    studentId: open ? studentId : null,
    term,
    academicYear,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {studentName} — {term === 'year' ? `Full year ${academicYear}` : `Term ${term} (${academicYear})`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading || !detail ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : detail.subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No marks captured for this student
              {detail.scope === 'year' ? ' this year' : ` in Term ${detail.term}`} yet.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {detail.admissionNumber && (
                  <Badge variant="outline" className="text-xs">{detail.admissionNumber}</Badge>
                )}
                {detail.overallAverage !== null && (
                  <Badge
                    variant={detail.overallAverage >= 50 ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    Overall {detail.overallAverage}%
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {detail.subjects.length} subject{detail.subjects.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <div className="space-y-3">
                {detail.subjects.map((s) => (
                  <SubjectCard key={s.subjectId} subject={s} />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubjectCard({ subject }: { subject: StudentTermDetailSubject }) {
  const sparkData = useMemo(
    () => subject.marks
      .filter((m) => !m.isAbsent)
      .map((m) => ({ name: m.assessmentName, percent: m.percent })),
    [subject.marks],
  );

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">{subject.subjectName}</p>
            <p className="text-xs text-muted-foreground">
              {subject.marks.length} mark{subject.marks.length === 1 ? '' : 's'}
              {subject.highestPercent !== null
                && ` · high ${subject.highestPercent}% · low ${subject.lowestPercent}%`}
            </p>
          </div>
          {subject.missingWeighting ? (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium text-destructive"
              title="Configure weightings on the gradebook overview to see this average"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              No weighting set
            </span>
          ) : (
            <span className={cn('text-2xl font-semibold', gradeColor(subject.weightedAverage))}>
              {subject.weightedAverage !== null ? `${subject.weightedAverage}%` : '—'}
            </span>
          )}
        </div>

        {sparkData.length >= 2 && (
          <div className="h-16 w-full">
            <ResponsiveContainer>
              <LineChart data={sparkData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <XAxis dataKey="name" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  formatter={(v) => [`${String(v)}%`, 'Mark']}
                  labelFormatter={(label) => String(label)}
                />
                <Line
                  type="monotone"
                  dataKey="percent"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <ul className="divide-y border-t">
          {subject.marks.map((m) => (
            <li key={m.assessmentId} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium truncate">{m.assessmentName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.date).toLocaleDateString()}
                  {m.weight !== 1 && ` · weight ${m.weight}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                {m.isAbsent ? (
                  <Badge variant="outline" className="text-[10px]">Absent</Badge>
                ) : (
                  <>
                    <p className={cn('font-medium', gradeColor(m.percent))}>{m.percent}%</p>
                    <p className="text-xs text-muted-foreground">{m.mark}/{m.total}</p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
