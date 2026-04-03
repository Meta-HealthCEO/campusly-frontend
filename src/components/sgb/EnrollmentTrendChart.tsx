'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChartComponent } from '@/components/charts';
import type { YearOverYear } from '@/types';

interface EnrollmentTrendChartProps {
  data: YearOverYear[];
}

export function EnrollmentTrendChart({ data }: EnrollmentTrendChartProps) {
  const chartData = data.map((d) => ({
    year: String(d.year),
    students: d.total,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Year-over-Year Enrollment</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChartComponent
          data={chartData}
          xKey="year"
          lines={[{ key: 'students', color: '#4F46E5', name: 'Total Students' }]}
          height={250}
        />
      </CardContent>
    </Card>
  );
}
