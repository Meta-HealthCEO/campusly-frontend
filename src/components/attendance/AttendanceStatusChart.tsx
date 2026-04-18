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

// Colors aligned with the rest of the attendance module:
// - Present: emerald-500  (#10B981)
// - Absent:  destructive  (#EF4444)
// - Late:    amber-500    (#F59E0B)
// - Excused: blue-500     (#3B82F6)
const STATUS_COLORS = {
  present: '#10B981',
  absent: '#EF4444',
  late: '#F59E0B',
  excused: '#3B82F6',
} as const;

export function AttendanceStatusChart({
  present,
  absent,
  late,
  excused,
}: AttendanceStatusChartProps) {
  const total = present + absent + late + excused;

  const data: ChartSlice[] = [
    { name: 'Present', value: present, color: STATUS_COLORS.present },
    { name: 'Absent', value: absent, color: STATUS_COLORS.absent },
    { name: 'Late', value: late, color: STATUS_COLORS.late },
    { name: 'Excused', value: excused, color: STATUS_COLORS.excused },
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
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
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
