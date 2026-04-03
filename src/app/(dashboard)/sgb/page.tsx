'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FinanceSummaryCards, MeetingList } from '@/components/sgb';
import { useSgbFinance } from '@/hooks/useSgbFinance';
import { useSgbMeetings } from '@/hooks/useSgbMeetings';
import { useSgbEnrollment } from '@/hooks/useSgbEnrollment';
import { useSgbCompliance } from '@/hooks/useSgbDocuments';
import { useAuthStore } from '@/stores/useAuthStore';
import { StatCard } from '@/components/shared/StatCard';
import { Users, GraduationCap, AlertTriangle, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SgbMeeting } from '@/types';

export default function SgbDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { summary: financeSummary, loading: financeLoading } = useSgbFinance();
  const { meetings, loading: meetingsLoading } = useSgbMeetings('scheduled');
  const { summary: enrollment, loading: enrollmentLoading } = useSgbEnrollment();
  const { compliance, loading: complianceLoading } = useSgbCompliance();

  const loading = financeLoading || meetingsLoading || enrollmentLoading || complianceLoading;

  const upcomingMeetings = useMemo(
    () => meetings.slice(0, 3),
    [meetings],
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="SGB Portal" description="School Governing Body overview and governance" />

      {/* Finance summary */}
      {financeSummary && <FinanceSummaryCards summary={financeSummary} />}

      {/* Quick stats row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Students"
          value={String(enrollment?.totalStudents ?? 0)}
          icon={GraduationCap}
          description={`+${enrollment?.newEnrollments ?? 0} new this year`}
        />
        <StatCard
          title="SGB Meetings"
          value={String(meetings.length)}
          icon={CalendarDays}
          description="Scheduled meetings"
        />
        <StatCard
          title="Policy Alerts"
          value={String(compliance?.overdue ?? 0)}
          icon={AlertTriangle}
          description={`${compliance?.dueForReview ?? 0} due for review`}
        />
      </div>

      {/* Upcoming meetings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Meetings</CardTitle>
          <Badge variant="outline" className="cursor-pointer" onClick={() => router.push('/sgb/meetings')}>
            View All
          </Badge>
        </CardHeader>
        <CardContent>
          <MeetingList
            meetings={upcomingMeetings}
            isAdmin={isAdmin}
            onView={(m: SgbMeeting) => router.push(`/sgb/meetings/${m.id}`)}
          />
        </CardContent>
      </Card>

      {/* Compliance alerts */}
      {compliance && compliance.overdue > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Overdue Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {compliance.policies
                .filter((p) => p.status === 'overdue')
                .map((p) => (
                  <li key={p.documentId} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.title}</span>
                    <span className="text-destructive font-medium shrink-0 ml-2">
                      {p.daysPastDue}d overdue
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
