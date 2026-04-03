'use client';

import { useEffect } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClassEngagementStatsCard } from '@/components/classroom/ClassEngagementStatsCard';
import { SessionAttendanceTable } from '@/components/classroom/SessionAttendanceTable';
import { SessionStatusBadge } from '@/components/classroom/SessionStatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClassroomSessions } from '@/hooks/useClassroomSessions';
import { useClassroomAnalytics } from '@/hooks/useClassroomAnalytics';
import { useAuthStore } from '@/stores/useAuthStore';

export default function AdminClassroomPage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const { sessions, loading: sessionsLoading } = useClassroomSessions();
  const {
    classStats,
    attendance,
    loading: analyticsLoading,
    fetchClassStats,
    fetchAttendance,
  } = useClassroomAnalytics();

  useEffect(() => {
    if (schoolId) {
      fetchClassStats(schoolId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  // Load attendance for the most recent session that has ended
  const latestEndedSession = sessions.find((s) => s.status === 'ended');

  useEffect(() => {
    if (latestEndedSession?.id) {
      fetchAttendance(latestEndedSession.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestEndedSession?.id]);

  const isLoading = sessionsLoading || analyticsLoading;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Virtual Classroom"
        description="School-wide session activity and engagement overview."
      />

      <ClassEngagementStatsCard stats={classStats} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <EmptyState
              icon={LayoutDashboard}
              title="No sessions yet"
              description="Scheduled and live sessions will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Title</th>
                    <th className="pb-2 pr-4 font-medium">Subject</th>
                    <th className="pb-2 pr-4 font-medium">Class</th>
                    <th className="pb-2 pr-4 font-medium">Teacher</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 10).map((session) => (
                    <tr key={session.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium truncate max-w-[160px]">
                        {session.title}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground truncate max-w-[120px]">
                        {session.subjectId.name}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground truncate max-w-[100px]">
                        {session.classId.name}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground truncate max-w-[130px]">
                        {session.teacherId.firstName} {session.teacherId.lastName}
                      </td>
                      <td className="py-2">
                        <SessionStatusBadge status={session.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {latestEndedSession && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Attendance — {latestEndedSession.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionAttendanceTable records={attendance} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
