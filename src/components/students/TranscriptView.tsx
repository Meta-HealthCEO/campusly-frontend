'use client';

import { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import type { TranscriptData, TranscriptYear } from '@/types';

interface TranscriptViewProps {
  transcript: TranscriptData;
}

function getSymbolColor(symbol: string): string {
  switch (symbol) {
    case 'A': return 'text-emerald-600 dark:text-emerald-400';
    case 'B': return 'text-blue-600 dark:text-blue-400';
    case 'C': return 'text-cyan-600 dark:text-cyan-400';
    case 'D': return 'text-amber-600 dark:text-amber-400';
    case 'E': return 'text-orange-600 dark:text-orange-400';
    default: return 'text-destructive';
  }
}

export function TranscriptView({ transcript }: TranscriptViewProps) {
  const { student, school, years, overallAverage } = transcript;

  if (years.length === 0) {
    return <EmptyState title="No Academic Records" description="No marks have been recorded for this student yet." />;
  }

  return (
    <div className="space-y-6">
      {/* Print button — hidden in print */}
      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print / Download PDF
        </Button>
      </div>

      {/* Header */}
      <div className="text-center border-b pb-4 print:pb-2">
        <h2 className="text-xl font-bold print:text-lg">{school.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">Academic Transcript</p>
      </div>

      {/* Student details */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm border-b pb-4 print:pb-2">
        <div>
          <p className="text-muted-foreground text-xs">Student Name</p>
          <p className="font-medium">{student.name}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Admission Number</p>
          <p className="font-medium">{student.admissionNumber}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Current Grade</p>
          <p className="font-medium">{student.currentGrade}</p>
        </div>
        {student.dateOfBirth && (
          <div>
            <p className="text-muted-foreground text-xs">Date of Birth</p>
            <p className="font-medium">{student.dateOfBirth}</p>
          </div>
        )}
      </div>

      {/* Year sections */}
      {years.map((year) => (
        <YearSection key={year.year} yearData={year} />
      ))}

      {/* Overall */}
      <div className="border-t pt-4 print:pt-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-lg">Overall Average</p>
          <p className="font-bold text-lg">{overallAverage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Print footer */}
      <p className="text-xs text-muted-foreground text-center print:block hidden">
        Generated on {new Date(transcript.generatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

// ─── Year Section ───────────────────────────────────────────────────────────

function YearSection({ yearData }: { yearData: TranscriptYear }) {
  // Collect all subjects across all terms for the unified table
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const term of yearData.terms) {
      for (const subject of term.subjects) {
        set.add(subject.name);
      }
    }
    return Array.from(set).sort();
  }, [yearData.terms]);

  // Build lookup: subject name -> term -> data
  const lookup = useMemo(() => {
    const map = new Map<string, Map<number, { percentage: number; symbol: string }>>();
    for (const term of yearData.terms) {
      for (const subject of term.subjects) {
        if (!map.has(subject.name)) map.set(subject.name, new Map());
        map.get(subject.name)!.set(term.term, {
          percentage: subject.percentage,
          symbol: subject.symbol,
        });
      }
    }
    return map;
  }, [yearData.terms]);

  const termNumbers = yearData.terms.map((t) => t.term).sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-base border-b pb-1">{yearData.year}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2 px-3 font-medium">Subject</th>
              {termNumbers.map((t) => (
                <th key={t} className="text-center py-2 px-2 font-medium">T{t}</th>
              ))}
              <th className="text-center py-2 px-2 font-medium">Avg</th>
              <th className="text-center py-2 px-2 font-medium">Symbol</th>
            </tr>
          </thead>
          <tbody>
            {allSubjects.map((subjectName) => {
              const termData = lookup.get(subjectName) ?? new Map();
              const percentages = Array.from(termData.values()).map((d) => d.percentage);
              const avg = percentages.length > 0
                ? percentages.reduce((a, b) => a + b, 0) / percentages.length
                : 0;
              const avgSymbol = getAverageSymbol(avg);

              return (
                <tr key={subjectName} className="border-b last:border-b-0">
                  <td className="py-1.5 px-3">{subjectName}</td>
                  {termNumbers.map((t) => {
                    const d = termData.get(t);
                    return (
                      <td key={t} className="text-center py-1.5 px-2">
                        {d ? `${d.percentage.toFixed(0)}%` : '-'}
                      </td>
                    );
                  })}
                  <td className="text-center py-1.5 px-2 font-medium">{avg.toFixed(0)}%</td>
                  <td className={`text-center py-1.5 px-2 font-bold ${getSymbolColor(avgSymbol)}`}>
                    {avgSymbol}
                  </td>
                </tr>
              );
            })}
            {/* Term average row */}
            <tr className="border-t-2 font-medium bg-muted/30">
              <td className="py-1.5 px-3">Term Average</td>
              {termNumbers.map((t) => {
                const term = yearData.terms.find((tm) => tm.term === t);
                return (
                  <td key={t} className="text-center py-1.5 px-2">
                    {term ? `${term.termAverage.toFixed(1)}%` : '-'}
                  </td>
                );
              })}
              <td className="text-center py-1.5 px-2" colSpan={2}>
                {yearData.terms.length > 0
                  ? `${(yearData.terms.reduce((a, t) => a + t.termAverage, 0) / yearData.terms.length).toFixed(1)}%`
                  : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getAverageSymbol(percentage: number): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  if (percentage >= 30) return 'F';
  return 'G';
}
