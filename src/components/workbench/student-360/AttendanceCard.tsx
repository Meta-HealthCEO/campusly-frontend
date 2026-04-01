'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Student360Attendance } from '@/types';

interface AttendanceCardProps {
  data: Student360Attendance;
}

const COLORS: Record<string, string> = {
  Present: '#10b981',
  Absent: 'hsl(var(--destructive))',
  Late: '#f59e0b',
  Excused: '#3b82f6',
};

export function AttendanceCard({ data }: AttendanceCardProps) {
  const pieData = [
    { name: 'Present', value: data.present },
    { name: 'Absent', value: data.absent },
    { name: 'Late', value: data.late },
    { name: 'Excused', value: data.excused },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-3xl font-bold">{data.rate}%</p>

        {pieData.length > 0 ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[entry.name] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0"
            />
            <span className="text-muted-foreground">Present</span>
            <span className="ml-auto font-medium">{data.present}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-destructive shrink-0"
            />
            <span className="text-muted-foreground">Absent</span>
            <span className="ml-auto font-medium">{data.absent}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0"
            />
            <span className="text-muted-foreground">Late</span>
            <span className="ml-auto font-medium">{data.late}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0"
            />
            <span className="text-muted-foreground">Excused</span>
            <span className="ml-auto font-medium">{data.excused}</span>
          </div>
        </div>

        {data.pattern && (
          <p className="text-xs text-muted-foreground border-t pt-2">
            Pattern: {data.pattern}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
