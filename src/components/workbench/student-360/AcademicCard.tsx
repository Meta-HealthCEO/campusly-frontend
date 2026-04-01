'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Student360Academic } from '@/types';

interface AcademicCardProps {
  data: Student360Academic;
}

export function AcademicCard({ data }: AcademicCardProps) {
  const trendConfig = {
    improving: {
      icon: TrendingUp,
      className: 'text-emerald-600',
      label: 'Improving',
    },
    declining: {
      icon: TrendingDown,
      className: 'text-destructive',
      label: 'Declining',
    },
    stable: {
      icon: Minus,
      className: 'text-muted-foreground',
      label: 'Stable',
    },
  };

  const trend = trendConfig[data.trend];
  const TrendIcon = trend.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Academic Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <p className="text-3xl font-bold">{data.termAverage}%</p>
          <div className={`flex items-center gap-1 mb-1 ${trend.className}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{trend.label}</span>
          </div>
        </div>

        {data.markHistory.length > 0 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.markHistory}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                <Tooltip formatter={(v: unknown) => [`${v}%`, 'Mark']} />
                <Line
                  type="monotone"
                  dataKey="mark"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.subjects.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-2 font-medium text-muted-foreground">
                    Subject
                  </th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">
                    Mark
                  </th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">
                    Grade
                  </th>
                  <th className="text-right py-1 pl-2 font-medium text-muted-foreground">
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.name} className="border-b last:border-0">
                    <td className="py-1 pr-2 truncate max-w-[100px]">{s.name}</td>
                    <td className="text-right py-1 px-2">{s.mark}%</td>
                    <td className="text-right py-1 px-2">{s.grade}</td>
                    <td className="text-right py-1 pl-2 text-muted-foreground">
                      {s.classAvg}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
