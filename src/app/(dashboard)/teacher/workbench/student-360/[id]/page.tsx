'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { AcademicCard } from '@/components/workbench/student-360/AcademicCard';
import { AttendanceCard } from '@/components/workbench/student-360/AttendanceCard';
import { BehaviourCard } from '@/components/workbench/student-360/BehaviourCard';
import { HomeworkCard } from '@/components/workbench/student-360/HomeworkCard';
import { CommunicationCard } from '@/components/workbench/student-360/CommunicationCard';
import { useStudent360 } from '@/hooks/useStudent360';

export default function Student360Page() {
  const params = useParams();
  const router = useRouter();
  const studentId = typeof params.id === 'string' ? params.id : '';
  const { data, loading } = useStudent360(studentId);

  if (loading) return <LoadingSpinner />;

  if (!data) {
    return (
      <EmptyState
        icon={UserCircle}
        title="Student not found"
        description="No 360 data is available for this student."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.studentName}
        description={`Class: ${data.className}`}
      >
        <Button variant="outline" size="default" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AcademicCard data={data.academic} />
        <AttendanceCard data={data.attendance} />
        <BehaviourCard data={data.behaviour} />
        <HomeworkCard data={data.homework} />
        <CommunicationCard data={data.communication} />
      </div>
    </div>
  );
}
