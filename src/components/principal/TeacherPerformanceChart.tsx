'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent } from '@/components/charts';
import type { TeacherPerformanceEntry } from '@/types';

interface TeacherPerformanceChartProps {
  data: TeacherPerformanceEntry[];
}

export function TeacherPerformanceChart({ data }: TeacherPerformanceChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teacher Performance (Anonymised)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No teacher performance data available.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((t) => ({
    name: `Teacher ${String.fromCharCode(64 + t.teacherIndex)}`,
    passRate: t.averageClassPassRate,
    avgMark: t.averageClassMark,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher Performance (Anonymised)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Teacher identities are randomised each load. This data is for aggregate pattern analysis only.
        </p>
      </CardHeader>
      <CardContent>
        <BarChartComponent
          data={chartData}
          xKey="name"
          bars={[
            { key: 'passRate', color: '#2563EB', name: 'Pass Rate %' },
            { key: 'avgMark', color: '#16A34A', name: 'Avg Mark %' },
          ]}
          height={300}
        />

        {/* Summary table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground">Teacher</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Subjects</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Classes</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Pass Rate</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Avg Mark</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Homework Set</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.teacherIndex} className="border-b">
                  <td className="p-2 font-medium">
                    Teacher {String.fromCharCode(64 + t.teacherIndex)}
                  </td>
                  <td className="text-center p-2">{t.subjectCount}</td>
                  <td className="text-center p-2">{t.classCount}</td>
                  <td className="text-center p-2">{t.averageClassPassRate}%</td>
                  <td className="text-center p-2">{t.averageClassMark}%</td>
                  <td className="text-center p-2">{t.homeworkSetCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
