'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Student360Homework } from '@/types';

interface HomeworkCardProps {
  data: Student360Homework;
}

export function HomeworkCard({ data }: HomeworkCardProps) {
  const stats = [
    { label: 'Submission Rate', value: `${data.submissionRate}%` },
    { label: 'Average Mark', value: `${data.averageMark}%` },
    { label: 'Late', value: String(data.lateCount) },
    { label: 'Missing', value: String(data.missingCount) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Homework</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
