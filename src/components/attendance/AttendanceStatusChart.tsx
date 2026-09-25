'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useChartTheme } from '@/hooks/useChartTheme';
import type { ChartTheme } from '@/lib/charts/chart-theme';

export interface AttendanceStatusChartProps {
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface ChartSlice {
  name: string;
  value: number;
  color: string;
}

/** Status colours from the chart theme (spec §4): present = secure green, late = amber, absent = red, excused = cobalt. */
const statusColours = (theme: ChartTheme | null) => ({
  present: theme?.series[1] ?? '',
  absent: theme?.series[3] ?? '',
  late: theme?.series[2] ?? '',
  excused: theme?.series[0] ?? '',
});

export function AttendanceStatusChart({
  present,
  absent,
  late,
  excused,
}: AttendanceStatusChartProps) {
  const theme = useChartTheme();
  const colours = statusColours(theme);
  const total = present + absent + late + excused;

  const data: ChartSlice[] = [
    { name: 'Present', value: present, color: colours.present },
    { name: 'Absent', value: absent, color: colours.absent },
    { name: 'Late', value: late, color: colours.late },
    { name: 'Excused', value: excused, color: colours.excused },
  ].filter((slice) => slice.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState
            icon={PieChartIcon}
            title="No attendance data"
            description="There are no attendance records in the selected range."
          />
        ) : !theme ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {data.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: theme.surface,
                  color: theme.text,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
