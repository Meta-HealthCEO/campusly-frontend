'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { SessionAttendanceTable, LivePollResults } from '@/components/classroom';
import { useClassroomAnalytics } from '@/hooks/useClassroomAnalytics';
import { useClassroomSessions } from '@/hooks/useClassroomSessions';

export default function SessionAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = typeof params.id === 'string' ? params.id : '';

  const { attendance, loading: analyticsLoading, fetchAttendance } = useClassroomAnalytics();
  const { sessions, loading: sessionsLoading } = useClassroomSessions();

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  useEffect(() => {
    if (sessionId) fetchAttendance(sessionId);
  }, [sessionId, fetchAttendance]);

  const loading = analyticsLoading || sessionsLoading;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={session ? `Analytics: ${session.title}` : 'Session Analytics'}
        description="Attendance and poll results for this session"
      >
        <Button variant="outline" onClick={() => router.push('/teacher/classroom')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      {/* Attendance */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Attendance</h2>
        {attendance.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title="No attendance data"
            description="Attendance records will appear here once students join the session."
          />
        ) : (
          <SessionAttendanceTable records={attendance} />
        )}
      </section>

      {/* Poll Results */}
      {session && session.polls.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Poll Results</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {session.polls.map((poll) => (
              <LivePollResults key={poll._id} poll={poll} />
            ))}
          </div>
        </section>
      )}

      {session && session.polls.length === 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Poll Results</h2>
          <EmptyState
            icon={BarChart2}
            title="No polls run"
            description="Live polls launched during the session will appear here."
          />
        </section>
      )}
    </div>
  );
}
