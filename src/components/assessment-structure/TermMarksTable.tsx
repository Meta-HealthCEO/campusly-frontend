'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TermMarksStudentCard } from './TermMarksStudentCard';
import type { TermMarksResponse, StudentTermResult, CategorySummary } from '@/types';

interface Props {
  data: TermMarksResponse;
  onEnterMarks: (lineItemId: string, categoryId: string, name: string, totalMarks: number) => void;
}

type SortMode = 'name' | 'termMark';

function fmtPct(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value * 10) / 10}%`;
}

function getCellValue(student: StudentTermResult, lineItemId: string): string {
  for (const cat of student.categories) {
    const li = cat.lineItems.find((l) => l.lineItemId === lineItemId);
    if (li) {
      if (li.isAbsent) return 'ABS';
      if (li.percentage === null) return '—';
      return fmtPct(li.percentage);
    }
  }
  return '—';
}

function classAvgForLineItem(students: StudentTermResult[], lineItemId: string): string {
  const values: number[] = [];
  for (const student of students) {
    for (const cat of student.categories) {
      const li = cat.lineItems.find((l) => l.lineItemId === lineItemId);
      if (li && !li.isAbsent && li.percentage !== null) {
        values.push(li.percentage);
      }
    }
  }
  if (values.length === 0) return '—';
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return fmtPct(avg);
}

function classAvgTermMark(students: StudentTermResult[]): string {
  const values = students
    .map((s) => s.projectedTermMark ?? s.finalTermMark)
    .filter((v): v is number => v !== null);
  if (values.length === 0) return '—';
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return fmtPct(avg);
}

interface FlatLineItem {
  lineItemId: string;
  name: string;
  totalMarks: number;
  categoryId: string;
  categoryName: string;
}

function flattenLineItems(categories: CategorySummary[]): FlatLineItem[] {
  return categories.flatMap((cat) =>
    cat.lineItems.map((li) => ({
      lineItemId: li.lineItemId,
      name: li.name,
      totalMarks: li.totalMarks,
      categoryId: cat.categoryId,
      categoryName: cat.name,
    })),
  );
}

export function TermMarksTable({ data, onEnterMarks }: Props) {
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');

  const lineItems = useMemo(() => flattenLineItems(data.categories), [data.categories]);

  const totalStudents = data.students.length;

  const classAvg = useMemo(() => classAvgTermMark(data.students), [data.students]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.students.filter((s) => s.studentName.toLowerCase().includes(q));
  }, [data.students, search]);

  const sorted = useMemo((): StudentTermResult[] => {
    return [...filtered].sort((a, b) => {
      if (sortMode === 'name') return a.studentName.localeCompare(b.studentName);
      const av = a.projectedTermMark ?? a.finalTermMark ?? -1;
      const bv = b.projectedTermMark ?? b.finalTermMark ?? -1;
      return bv - av;
    });
  }, [filtered, sortMode]);

  return (
    <div className="space-y-4">
      {/* Completion bar */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        <span>Captured: <strong className="text-foreground">{data.completionPercent}%</strong> of term weight</span>
        <span>{totalStudents} student{totalStudents !== 1 ? 's' : ''}</span>
        <span>Class avg: <strong className="text-foreground">{classAvg}</strong></span>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortMode((m) => (m === 'name' ? 'termMark' : 'name'))}
          className="shrink-0"
        >
          <ArrowUpDown className="h-4 w-4 mr-1" />
          Sort: {sortMode === 'name' ? 'Name' : 'Term Mark'}
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/50 min-w-[160px]">Student</th>
              {lineItems.map((li) => (
                <th key={li.lineItemId} className="text-center px-2 py-1 font-medium min-w-[90px]">
                  <div className="text-xs text-muted-foreground leading-tight">{li.categoryName}</div>
                  <button
                    type="button"
                    className="text-xs hover:underline leading-tight"
                    onClick={() => onEnterMarks(li.lineItemId, li.categoryId, li.name, li.totalMarks)}
                  >
                    {li.name}
                  </button>
                </th>
              ))}
              <th className="text-center px-3 py-2 font-medium min-w-[110px]">Term Mark</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((student) => (
              <tr key={student.studentId} className="border-b hover:bg-muted/20">
                <td className="px-3 py-2 truncate sticky left-0 bg-background max-w-[160px]">
                  {student.studentName}
                </td>
                {lineItems.map((li) => (
                  <td key={li.lineItemId} className="text-center px-2 py-2 text-muted-foreground">
                    {getCellValue(student, li.lineItemId)}
                  </td>
                ))}
                <td className="text-center px-3 py-2">
                  {student.projectedTermMark !== null || student.finalTermMark !== null ? (
                    <Badge variant={(student.projectedTermMark ?? student.finalTermMark ?? 0) >= 50 ? 'default' : 'destructive'}>
                      {fmtPct(student.projectedTermMark ?? student.finalTermMark)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}

            {/* Class average row */}
            {sorted.length > 0 && (
              <tr className="border-t bg-muted/40 font-medium">
                <td className="px-3 py-2 sticky left-0 bg-muted/40">Class Avg</td>
                {lineItems.map((li) => (
                  <td key={li.lineItemId} className="text-center px-2 py-2 text-muted-foreground text-xs">
                    {classAvgForLineItem(data.students, li.lineItemId)}
                  </td>
                ))}
                <td className="text-center px-3 py-2">{classAvg}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {sorted.map((student) => (
          <TermMarksStudentCard key={student.studentId} student={student} />
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No students match your search.</p>
      )}
    </div>
  );
}
