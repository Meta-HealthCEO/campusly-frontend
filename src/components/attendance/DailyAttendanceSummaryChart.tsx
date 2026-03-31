'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent } from '@/components/charts';

interface DailyClassSummary {
  classId: string;
  className: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface DailyAttendanceSummaryChartProps {
  data: DailyClassSummary[];
}

export function DailyAttendanceSummaryChart({ data }: DailyAttendanceSummaryChartProps) {
  const chartData = data.map((d) => ({
    className: d.className,
    Present: d.present,
    Absent: d.absent,
    Late: d.late,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance by Class</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No attendance data for the selected date.
          </p>
        ) : (
          <BarChartComponent
            data={chartData as Record<string, unknown>[]}
            xKey="className"
            bars={[
              { key: 'Present', color: '#10B981', name: 'Present' },
              { key: 'Absent', color: '#EF4444', name: 'Absent' },
              { key: 'Late', color: '#F59E0B', name: 'Late' },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
