'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, CreditCard, BookOpen, Calendar, Activity } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { QuickStatsRow } from '@/components/student-360/QuickStatsRow';
import { AcademicSummaryCard } from '@/components/student-360/AcademicSummaryCard';
import { AttendanceSummaryCard } from '@/components/student-360/AttendanceSummaryCard';
import { RecentActivityCard } from '@/components/student-360/RecentActivityCard';
import { useFullStudent360 } from '@/hooks/useFullStudent360';
import Link from 'next/link';

export default function ChildProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const { data, loading, error, loadStudent360 } = useFullStudent360();

  useEffect(() => {
    if (studentId) {
      loadStudent360(studentId);
    }
  }, [studentId, loadStudent360]);

  if (loading) return <LoadingSpinner />;

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Child Profile" description="View your child's complete school profile.">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        <EmptyState
          icon={Activity}
          title="Unable to load profile"
          description={error ?? 'Student data could not be found.'}
        />
      </div>
    );
  }

  const { student } = data;
  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName}
        description={`${student.gradeName} - ${student.className} | ${student.admissionNumber}`}
      >
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <QuickStatsRow data={data} />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <AcademicSummaryCard academic={data.academic} />
        <AttendanceSummaryCard attendance={data.attendance} />
      </div>

      <RecentActivityCard
        achievements={data.achievements}
        behaviour={data.behaviour}
        sports={data.sports}
      />

      {/* Quick links to module detail pages */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Link href={`/parent/report-card/${studentId}`}>
          <Button variant="outline" className="w-full justify-start gap-2">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">Report Card</span>
          </Button>
        </Link>
        <Link href="/parent/fees">
          <Button variant="outline" className="w-full justify-start gap-2">
            <CreditCard className="h-4 w-4 shrink-0" />
            <span className="truncate">Fees</span>
          </Button>
        </Link>
        <Link href="/parent/homework">
          <Button variant="outline" className="w-full justify-start gap-2">
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">Homework</span>
          </Button>
        </Link>
        <Link href="/parent/attendance">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">Attendance</span>
          </Button>
        </Link>
        <Link href="/parent/sports">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Activity className="h-4 w-4 shrink-0" />
            <span className="truncate">Sports</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
