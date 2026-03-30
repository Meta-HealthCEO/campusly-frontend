'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Progress } from '@/components/ui/progress';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import {
  mockStudentGrades,
  mockSubjects,
  mockStudents,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';

function getGradeColor(percentage: number): string {
  if (percentage >= 80) return 'text-emerald-600';
  if (percentage >= 60) return 'text-blue-600';
  if (percentage >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function getGradeBadge(percentage: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (percentage >= 80) return { label: 'Distinction', variant: 'default' };
  if (percentage >= 60) return { label: 'Merit', variant: 'secondary' };
  if (percentage >= 50) return { label: 'Pass', variant: 'outline' };
  return { label: 'Below Average', variant: 'destructive' };
}

export default function StudentGradesPage() {
  const [grades, setGrades] = useState(mockStudentGrades);
  const [subjects, setSubjects] = useState(mockSubjects);

  useEffect(() => {
    async function fetchData() {
      try {
        const [gradesRes, subjectsRes] = await Promise.allSettled([
          apiClient.get('/grades'),
          apiClient.get('/subjects'),
        ]);
        if (gradesRes.status === 'fulfilled' && gradesRes.value.data) {
          const data = gradesRes.value.data.data ?? gradesRes.value.data;
          if (Array.isArray(data)) setGrades(data);
        }
        if (subjectsRes.status === 'fulfilled' && subjectsRes.value.data) {
          const data = subjectsRes.value.data.data ?? subjectsRes.value.data;
          if (Array.isArray(data)) setSubjects(data);
        }
      } catch {
        console.warn('API unavailable, using mock data');
      }
    }
    fetchData();
  }, []);

  const currentStudent = mockStudents[0];

  const myGrades = grades.filter(
    (sg) => sg.studentId === currentStudent.id
  );

  const gradesBySubject = subjects
    .map((subject) => {
      const subjectGrades = myGrades.filter(
        (g) => g.assessment.subjectId === subject.id
      );
      if (subjectGrades.length === 0) return null;

      const averagePercentage =
        subjectGrades.reduce((sum, g) => sum + g.percentage, 0) /
        subjectGrades.length;

      return {
        subject,
        grades: subjectGrades,
        average: Math.round(averagePercentage),
      };
    })
    .filter(Boolean) as {
    subject: (typeof mockSubjects)[0];
    grades: typeof myGrades;
    average: number;
  }[];

  const overallAverage =
    gradesBySubject.length > 0
      ? Math.round(
          gradesBySubject.reduce((sum, s) => sum + s.average, 0) /
            gradesBySubject.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Grades"
        description="Track your academic performance across all subjects"
      />

      {/* Overall Average */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
            <span className={cn('text-2xl font-bold', getGradeColor(overallAverage))}>
              {overallAverage}%
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Overall Average</h3>
            <p className="text-sm text-muted-foreground">
              Across {gradesBySubject.length} subjects
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subject Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gradesBySubject.map(({ subject, grades: subjectGrades, average }) => {
          const gradeBadge = getGradeBadge(average);

          return (
            <Card key={subject.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{subject.name}</CardTitle>
                  <Badge variant={gradeBadge.variant}>{gradeBadge.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={cn('text-3xl font-bold', getGradeColor(average))}>
                    {average}%
                  </span>
                  <div className="flex-1">
                    <Progress value={average} />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Assessments
                  </p>
                  {subjectGrades.map((grade) => (
                    <div
                      key={grade.id}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <div>
                        <p className="text-sm">{grade.assessment?.name ?? (grade as any).assessmentName ?? ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {grade.assessment?.type ?? (grade as any).assessmentType ?? ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            getGradeColor(grade.percentage)
                          )}
                        >
                          {grade.marks}/{grade.assessment?.totalMarks ?? (grade as any).totalMarks ?? ''}
                        </span>
                        {grade.percentage >= 70 ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : grade.percentage < 50 ? (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {gradesBySubject.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Grades Yet</h3>
            <p className="text-sm text-muted-foreground">
              Your grades will appear here once assessments have been graded.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
