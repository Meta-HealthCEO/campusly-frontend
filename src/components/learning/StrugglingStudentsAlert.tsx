'use client';

import { useEffect } from 'react';
import { AlertTriangle, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useLearningStore } from '@/stores/useLearningStore';

interface StrugglingStudentsAlertProps {
  classId: string;
}

export function StrugglingStudentsAlert({ classId }: StrugglingStudentsAlertProps) {
  const { strugglingStudents, strugglingLoading, fetchStrugglingStudents } = useLearningStore();

  useEffect(() => {
    if (classId) {
      fetchStrugglingStudents(classId);
    }
  }, [classId, fetchStrugglingStudents]);

  if (strugglingLoading) return <LoadingSpinner />;

  if (strugglingStudents.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No Struggling Students"
        description="No struggling students identified in this class."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Struggling Students ({strugglingStudents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {strugglingStudents.map((s, i) => {
            const TrendIcon = s.trend === 'declining' ? TrendingDown : Minus;
            const trendStyle = s.trend === 'declining' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';

            return (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Student: {s.studentId}</p>
                  <p className="text-xs text-muted-foreground">Subject: {s.subjectId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${s.averageMark < 50 ? 'text-red-600' : 'text-amber-600'}`}>
                    {Math.round(s.averageMark)}%
                  </span>
                  <Badge variant="secondary" className={trendStyle}>
                    <TrendIcon className="mr-1 h-3 w-3" />
                    {s.trend}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
