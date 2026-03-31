'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { GraduationCap } from 'lucide-react';
import type { StudentGrade } from '@/types';

interface AcademicTabProps {
  grades: StudentGrade[];
}

export function AcademicTab({ grades }: AcademicTabProps) {
  if (grades.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No grades yet"
        description="Academic results will appear here once assessments are graded."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {grades.map((sg) => {
            const assessmentName = sg.assessment?.name ?? 'Assessment';
            const subjectName = sg.assessment?.subject?.name ?? '';
            const assessmentType = sg.assessment?.type ?? '';
            const totalMarks = sg.assessment?.totalMarks ?? 100;
            return (
              <div key={sg.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{assessmentName}</p>
                  <p className="text-sm text-muted-foreground">
                    {subjectName}{assessmentType ? ` - ${assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{sg.marks}/{totalMarks}</p>
                  <p className="text-sm text-muted-foreground">{sg.percentage}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
