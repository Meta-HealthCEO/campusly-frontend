'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChartComponent } from '@/components/charts';
import type { TermTrendData } from '@/types';

interface TermTrendChartsProps {
  data: TermTrendData;
}

export function TermTrendCharts({ data }: TermTrendChartsProps) {
  const chartData = data.terms.map((t) => ({
    name: `Term ${t.term}`,
    attendance: t.attendance ?? 0,
    passRate: t.passRate ?? 0,
    feeCollection: t.feeCollection ?? 0,
    teacherAttendance: t.teacherAttendance ?? 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Term-over-Term Trends ({data.year})</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChartComponent
          data={chartData}
          xKey="name"
          lines={[
            { key: 'attendance', color: '#2563EB', name: 'Attendance %' },
            { key: 'passRate', color: '#16A34A', name: 'Pass Rate %' },
            { key: 'feeCollection', color: '#D97706', name: 'Fee Collection %' },
            { key: 'teacherAttendance', color: '#9333EA', name: 'Teacher Attendance %' },
          ]}
          height={300}
        />
      </CardContent>
    </Card>
  );
}
