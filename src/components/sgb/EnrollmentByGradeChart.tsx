'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent } from '@/components/charts';
import type { GradeEnrollment } from '@/types';

interface EnrollmentByGradeChartProps {
  grades: GradeEnrollment[];
}

export function EnrollmentByGradeChart({ grades }: EnrollmentByGradeChartProps) {
  const chartData = grades.map((g) => ({
    grade: g.grade,
    enrolled: g.count,
    capacity: g.capacity,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment by Grade</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartComponent
          data={chartData}
          xKey="grade"
          bars={[
            { key: 'enrolled', color: '#2563EB', name: 'Enrolled' },
            { key: 'capacity', color: '#CBD5E1', name: 'Capacity' },
          ]}
          height={300}
        />
      </CardContent>
    </Card>
  );
}
