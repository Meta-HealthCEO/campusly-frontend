'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ProgressDashboard } from '@/components/learning/ProgressDashboard';
import { useLearningStore } from '@/stores/useLearningStore';
import { useLearningApi } from '@/hooks/useLearningApi';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';

export default function StudentProgressPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const { studentProgress, progressLoading } = useLearningStore();
  const { fetchStudentProgress } = useLearningApi();

  useEffect(() => {
    if (!student) return;
    const sid = student._id ?? student.id;
    fetchStudentProgress(sid);
  }, [student, fetchStudentProgress]);

  if (studentLoading || progressLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Progress"
        description="Track your mastery and performance across subjects."
      />
      <ProgressDashboard progress={studentProgress} />
    </div>
  );
}
