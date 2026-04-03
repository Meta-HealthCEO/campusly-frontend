'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SubjectHeatmapEntry } from '@/types';

interface SubjectHeatmapProps {
  data: SubjectHeatmapEntry[];
}

function cellColor(passRate: number): string {
  if (passRate >= 80) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
  if (passRate >= 60) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
  return 'bg-destructive/20 text-destructive';
}

export function SubjectHeatmap({ data }: SubjectHeatmapProps) {
  const allGrades = useMemo(() => {
    const gradeMap = new Map<string, string>();
    for (const subject of data) {
      for (const g of subject.grades) {
        gradeMap.set(g.gradeId, g.gradeName);
      }
    }
    return Array.from(gradeMap.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subject Performance Heat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No subject data available for this period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Performance Heat Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium text-muted-foreground">Subject</th>
                {allGrades.map((g) => (
                  <th key={g.id} className="text-center p-2 font-medium text-muted-foreground">
                    {g.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((subject) => (
                <tr key={subject.subjectId} className="border-t">
                  <td className="p-2 font-medium truncate max-w-[150px]">{subject.subjectName}</td>
                  {allGrades.map((grade) => {
                    const cell = subject.grades.find((g) => g.gradeId === grade.id);
                    if (!cell) {
                      return <td key={grade.id} className="p-2 text-center text-muted-foreground">-</td>;
                    }
                    return (
                      <td key={grade.id} className="p-2 text-center">
                        <div
                          className={cn(
                            'rounded-md px-2 py-1 text-xs font-semibold inline-block min-w-[48px]',
                            cellColor(cell.passRate),
                          )}
                          title={`Avg: ${cell.averagePercent}% | Pass: ${cell.passRate}% | Students: ${cell.studentCount}`}
                        >
                          {cell.passRate}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500/20" />
            <span>&ge; 80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500/20" />
            <span>60-79%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/20" />
            <span>&lt; 60%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
