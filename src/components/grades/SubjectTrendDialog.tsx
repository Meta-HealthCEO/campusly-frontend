'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, Line, Scatter,
} from 'recharts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useSubjectTrend } from '@/hooks/useSubjectTrend';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  subjectId: string | null;
  subjectName: string;
  academicYear: number;
}

interface ChartDatum {
  termLabel: string;
  termAverage: number | null;
  // Per-assessment scatter point (one term may have several).
  assessmentAverage?: number;
  assessmentName?: string;
}

export function SubjectTrendDialog({
  open, onOpenChange, classId, subjectId, subjectName, academicYear,
}: Props) {
  const { trend, loading } = useSubjectTrend({
    classId,
    subjectId: subjectId ?? '',
    academicYear,
    enabled: open && !!subjectId,
  });

  const chartData = useMemo<ChartDatum[]>(() => {
    if (!trend) return [];
    // One row per assessment so we get a scatter point on the right term;
    // term-level line uses the same termAverage on every row in that term.
    const rows: ChartDatum[] = [];
    for (const t of trend.terms) {
      const inTerm = trend.assessments.filter((a) => a.term === t.term);
      if (inTerm.length === 0) {
        rows.push({ termLabel: `T${t.term}`, termAverage: t.classAverage });
        continue;
      }
      for (const a of inTerm) {
        rows.push({
          termLabel: `T${t.term}`,
          termAverage: t.classAverage,
          assessmentAverage: a.classAverage ?? undefined,
          assessmentName: a.name,
        });
      }
    }
    return rows;
  }, [trend]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {subjectName} — class trend ({academicYear})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading || !trend ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {trend.terms.map((t) => (
                  <Badge
                    key={t.term}
                    variant={t.classAverage !== null ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    Term {t.term}: {t.classAverage !== null ? `${t.classAverage}%` : '—'}
                    {t.assessmentCount > 0 && ` · ${t.assessmentCount} test${t.assessmentCount === 1 ? '' : 's'}`}
                  </Badge>
                ))}
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="termLabel" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value, name) => [`${String(value)}%`, String(name)]}
                      labelFormatter={(label) => String(label)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="termAverage"
                      name="Term avg"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Scatter
                      dataKey="assessmentAverage"
                      name="Per assessment"
                      fill="hsl(var(--primary))"
                      shape="circle"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {trend.assessments.length > 0 && (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium">Assessment</th>
                        <th className="px-3 py-2 text-left font-medium">Term</th>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-right font-medium">Class avg</th>
                        <th className="px-3 py-2 text-right font-medium">Marked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.assessments.map((a) => (
                        <tr key={a.assessmentId} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{a.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">T{a.term}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(a.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {a.classAverage !== null ? `${a.classAverage}%` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {a.studentsWithMarks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
