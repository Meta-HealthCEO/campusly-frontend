'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { ReportCardMark } from '@/hooks/useReports';

interface ReportCardTableProps {
  marks: ReportCardMark[];
  term: number;
  academicYear: number;
}

interface GroupedSubject {
  subjectName: string;
  subjectCode: string;
  marks: ReportCardMark[];
  average: number;
}

function groupBySubject(marks: ReportCardMark[]): GroupedSubject[] {
  const map = new Map<string, GroupedSubject>();

  for (const m of marks) {
    const subjectId = m.assessmentId?.subjectId?._id ?? 'unknown';
    const subjectName = m.assessmentId?.subjectId?.name ?? 'Unknown Subject';
    const subjectCode = m.assessmentId?.subjectId?.code ?? '';

    if (!map.has(subjectId)) {
      map.set(subjectId, { subjectName, subjectCode, marks: [], average: 0 });
    }
    map.get(subjectId)!.marks.push(m);
  }

  for (const group of map.values()) {
    const total = group.marks.reduce((sum, m) => sum + m.percentage, 0);
    group.average = group.marks.length > 0 ? Math.round((total / group.marks.length) * 100) / 100 : 0;
  }

  return Array.from(map.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

function getPercentageColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 60) return 'text-blue-600 dark:text-blue-400';
  if (pct >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-destructive dark:text-destructive';
}

export function ReportCardTable({ marks, term, academicYear }: ReportCardTableProps) {
  const groups = groupBySubject(marks);

  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No marks found for Term {term}, {academicYear}.
      </p>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {groups.map((group) => (
        <div key={group.subjectCode} className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-semibold">
              {group.subjectName} ({group.subjectCode})
            </h4>
            <span className={`text-sm font-medium ${getPercentageColor(group.average)}`}>
              Avg: {group.average}%
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.marks.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell className="font-medium">{m.assessmentId?.name ?? '-'}</TableCell>
                    <TableCell className="capitalize">{m.assessmentId?.type ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {m.mark}/{m.assessmentId?.totalMarks ?? '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getPercentageColor(m.percentage)}`}>
                      {m.percentage}%
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.comment ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
