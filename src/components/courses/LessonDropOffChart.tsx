'use client';

import { BarChartComponent } from '@/components/charts';
import type { CourseAnalytics } from '@/types';

interface LessonDropOffChartProps {
  data: CourseAnalytics['perLessonDropOff'];
}

function truncateTitle(title: string, max = 20): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

export function LessonDropOffChart({ data }: LessonDropOffChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No lesson progress yet
      </p>
    );
  }

  const chartData = [...data]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((lesson) => ({
      name: truncateTitle(lesson.title),
      Reached: lesson.studentsReached,
      Completed: lesson.studentsCompleted,
    }));

  return (
    <BarChartComponent
      data={chartData}
      xKey="name"
      bars={[
        { key: 'Reached', name: 'Reached', color: '#2563EB' },
        { key: 'Completed', name: 'Completed', color: '#10B981' },
      ]}
      height={300}
    />
  );
}
