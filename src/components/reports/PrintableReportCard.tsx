'use client';

import { useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { ReportCardMark } from '@/hooks/useReports';

interface StudentInfo {
  name: string;
  admissionNumber: string;
  gradeName: string;
  className: string;
}

interface PrintableReportCardProps {
  marks: ReportCardMark[];
  term: number;
  academicYear: number;
  student?: StudentInfo;
  schoolName?: string;
}

interface SubjectRow {
  subjectName: string;
  subjectCode: string;
  mark: number;
  total: number;
  percentage: number;
  symbol: string;
  teacherComment: string;
}

function getGradeSymbol(pct: number): string {
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}

function getSymbolLabel(symbol: string): string {
  const labels: Record<string, string> = {
    A: 'Outstanding',
    B: 'Meritorious',
    C: 'Substantial',
    D: 'Adequate',
    E: 'Elementary',
    F: 'Not Achieved',
  };
  return labels[symbol] ?? '';
}

function getPercentageClass(pct: number): string {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 60) return 'text-blue-600 dark:text-blue-400';
  if (pct >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-destructive';
}

export function PrintableReportCard({
  marks,
  term,
  academicYear,
  student,
  schoolName,
}: PrintableReportCardProps) {
  const subjects: SubjectRow[] = useMemo(() => {
    const map = new Map<string, { name: string; code: string; totalMark: number; totalPossible: number; comments: string[] }>();

    for (const m of marks) {
      const subId = m.assessmentId?.subjectId?._id ?? 'unknown';
      const subName = m.assessmentId?.subjectId?.name ?? 'Unknown Subject';
      const subCode = m.assessmentId?.subjectId?.code ?? '';

      if (!map.has(subId)) {
        map.set(subId, { name: subName, code: subCode, totalMark: 0, totalPossible: 0, comments: [] });
      }
      const entry = map.get(subId)!;
      entry.totalMark += m.mark;
      entry.totalPossible += m.assessmentId?.totalMarks ?? 0;
      if (m.comment) entry.comments.push(m.comment);
    }

    return Array.from(map.values())
      .map((entry) => {
        const pct = entry.totalPossible > 0
          ? Math.round((entry.totalMark / entry.totalPossible) * 10000) / 100
          : 0;
        return {
          subjectName: entry.name,
          subjectCode: entry.code,
          mark: entry.totalMark,
          total: entry.totalPossible,
          percentage: pct,
          symbol: getGradeSymbol(pct),
          teacherComment: entry.comments[entry.comments.length - 1] ?? '-',
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [marks]);

  const overallAvg = useMemo(() => {
    if (subjects.length === 0) return 0;
    return Math.round(subjects.reduce((s, sub) => s + sub.percentage, 0) / subjects.length * 100) / 100;
  }, [subjects]);

  if (subjects.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No marks found for Term {term}, {academicYear}.
      </p>
    );
  }

  return (
    <div className="print:text-black print:bg-white">
      {/* School header */}
      <div className="text-center mb-6 print:mb-4">
        <h1 className="text-xl font-bold print:text-2xl">{schoolName ?? 'School Name'}</h1>
        <h2 className="text-base font-semibold mt-1">
          Student Report Card — Term {term}, {academicYear}
        </h2>
      </div>

      {/* Student info */}
      {student && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6 print:mb-4 border rounded-lg p-4 print:border-black">
          <div><span className="font-medium">Name:</span> {student.name}</div>
          <div><span className="font-medium">Admission No:</span> {student.admissionNumber}</div>
          <div><span className="font-medium">Grade:</span> {student.gradeName}</div>
          <div><span className="font-medium">Class:</span> {student.className}</div>
        </div>
      )}

      {/* Subjects table */}
      <div className="overflow-x-auto rounded-lg border print:border-black">
        <Table>
          <TableHeader>
            <TableRow className="print:bg-gray-100">
              <TableHead className="font-semibold">Subject</TableHead>
              <TableHead className="text-right font-semibold">Mark</TableHead>
              <TableHead className="text-right font-semibold">Total</TableHead>
              <TableHead className="text-right font-semibold">%</TableHead>
              <TableHead className="text-center font-semibold">Symbol</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((sub) => (
              <TableRow key={sub.subjectCode}>
                <TableCell className="font-medium">
                  {sub.subjectName}
                  <span className="text-muted-foreground ml-1 text-xs">({sub.subjectCode})</span>
                </TableCell>
                <TableCell className="text-right">{sub.mark}</TableCell>
                <TableCell className="text-right">{sub.total}</TableCell>
                <TableCell className={`text-right font-medium ${getPercentageClass(sub.percentage)}`}>
                  {sub.percentage}%
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold">{sub.symbol}</span>
                  <span className="text-xs text-muted-foreground ml-1 hidden print:inline">
                    ({getSymbolLabel(sub.symbol)})
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm hidden sm:table-cell truncate max-w-50">
                  {sub.teacherComment}
                </TableCell>
              </TableRow>
            ))}
            {/* Overall average row */}
            <TableRow className="font-semibold border-t-2">
              <TableCell>Overall Average</TableCell>
              <TableCell />
              <TableCell />
              <TableCell className={`text-right ${getPercentageClass(overallAvg)}`}>
                {overallAvg}%
              </TableCell>
              <TableCell className="text-center">{getGradeSymbol(overallAvg)}</TableCell>
              <TableCell className="hidden sm:table-cell" />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Grade key */}
      <div className="mt-4 text-xs text-muted-foreground print:text-black">
        <p className="font-medium mb-1">Grading Scale:</p>
        <p>A (80-100) Outstanding | B (70-79) Meritorious | C (60-69) Substantial | D (50-59) Adequate | E (40-49) Elementary | F (0-39) Not Achieved</p>
      </div>

      {/* Signature lines (print only) */}
      <div className="mt-8 grid-cols-2 gap-8 print:mt-12 hidden print:grid">
        <div className="border-t border-black pt-2 text-sm text-center">
          Class Teacher Signature
        </div>
        <div className="border-t border-black pt-2 text-sm text-center">
          Principal Signature
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:grid { display: grid !important; }
          .print\\:inline { display: inline !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
