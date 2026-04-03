'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users } from 'lucide-react';
import type { WorkloadEntry } from '@/types';

interface WorkloadChartProps {
  workload: WorkloadEntry[];
}

export function WorkloadChart({ workload }: WorkloadChartProps) {
  const chartData = useMemo(
    () =>
      workload.map((w) => ({
        name: w.teacherName.split(' ').slice(-1)[0],
        fullName: w.teacherName,
        classes: w.classCount,
        subjects: w.subjectCount,
        periods: w.periodsPerWeek,
      })),
    [workload],
  );

  if (workload.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No workload data"
        description="Workload data will appear once teachers are assigned to the department."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workload Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: unknown, name: unknown) => [String(value), String(name)]}
              labelFormatter={(label: unknown) => {
                const s = String(label);
                const item = chartData.find((d) => d.name === s);
                return item?.fullName ?? s;
              }}
            />
            <Legend />
            <Bar dataKey="classes" fill="hsl(var(--primary))" name="Classes" />
            <Bar dataKey="subjects" fill="hsl(var(--secondary))" name="Subjects" />
            <Bar dataKey="periods" fill="hsl(var(--accent))" name="Periods/Week" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
