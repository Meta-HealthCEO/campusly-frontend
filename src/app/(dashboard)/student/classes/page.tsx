'use client';

import { Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClassCard } from '@/components/student/ClassCard';
import { useStudentClasses } from '@/hooks/useStudentClasses';

export default function StudentClassesPage() {
  const { homeroom, loading } = useStudentClasses();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Classes"
        description="Your current class at school."
      />

      {homeroom ? (
        <ClassCard cls={homeroom} variant="homeroom" />
      ) : (
        <EmptyState
          icon={Users}
          title="You haven't joined a class yet"
          description="Use the join card on your dashboard with the code from your teacher."
        />
      )}
    </div>
  );
}
