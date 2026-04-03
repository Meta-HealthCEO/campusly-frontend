'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';
import type { DepartmentPacing, PacingStatus } from '@/types';

interface CurriculumPacingListProps {
  pacing: DepartmentPacing | null;
}

function PacingStatusBadge({ status }: { status: PacingStatus }) {
  switch (status) {
    case 'ahead':
      return <Badge variant="default">Ahead</Badge>;
    case 'on_track':
      return <Badge className="bg-emerald-600 text-white">On Track</Badge>;
    case 'behind':
      return <Badge variant="secondary" className="bg-amber-500 text-white">Behind</Badge>;
    case 'significantly_behind':
      return <Badge variant="destructive">Significantly Behind</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function ProgressBar({ actual, expected }: { actual: number; expected: number }) {
  return (
    <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
      <div
        className="absolute h-full bg-primary/80 rounded-full transition-all"
        style={{ width: `${Math.min(actual, 100)}%` }}
      />
      <div
        className="absolute h-full w-0.5 bg-foreground/50"
        style={{ left: `${Math.min(expected, 100)}%` }}
        title={`Expected: ${expected}%`}
      />
    </div>
  );
}

export function CurriculumPacingList({ pacing }: CurriculumPacingListProps) {
  if (!pacing || pacing.teachers.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No pacing data"
        description="Curriculum pacing data will appear once teachers track coverage."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Week {pacing.termWeeksElapsed} of {pacing.termTotalWeeks} |
        Expected progress: {pacing.expectedProgress}%
      </div>

      {pacing.teachers.map((teacher) => (
        <Card key={teacher.teacherId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base truncate">{teacher.teacherName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacher.subjects.map((subject) => (
              <div key={subject.subjectId} className="space-y-2">
                <p className="text-sm font-medium truncate">{subject.subjectName}</p>
                {subject.classes.map((cls) => (
                  <div key={cls.classId} className="space-y-1 pl-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm truncate">{cls.className}</span>
                      <PacingStatusBadge status={cls.status} />
                      <span className="text-xs text-muted-foreground">
                        {cls.completedTopics}/{cls.totalTopics} topics ({cls.actualProgress}%)
                      </span>
                    </div>
                    <ProgressBar
                      actual={cls.actualProgress}
                      expected={cls.expectedProgress}
                    />
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
