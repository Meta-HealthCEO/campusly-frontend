'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { UpcomingSessionCard, SessionStatusBadge } from '@/components/classroom';
import { useClassroomSessions } from '@/hooks/useClassroomSessions';
import type { VirtualSession } from '@/types';

export default function StudentClassroomPage() {
  const router = useRouter();
  const { sessions, loading, getJoinToken } = useClassroomSessions();

  const upcoming = sessions.filter(
    (s: VirtualSession) => s.status === 'scheduled' || s.status === 'live',
  );
  const past = sessions.filter(
    (s: VirtualSession) => s.status === 'ended' || s.status === 'cancelled',
  );

  const handleJoin = useCallback(async (sessionId: string) => {
    try {
      await getJoinToken(sessionId);
      router.push(`/classroom/${sessionId}`);
    } catch (err: unknown) {
      console.error('Failed to join session', err);
      toast.error('Failed to join session');
    }
  }, [getJoinToken, router]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <PageHeader title="Virtual Classroom" description="Join live sessions and view your class history">
        <Button variant="outline" onClick={() => router.push('/student/classroom/library')}>
          <Video className="mr-2 h-4 w-4" />
          Video Library
        </Button>
      </PageHeader>

      {/* Upcoming & Live Sessions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Upcoming Sessions</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No upcoming sessions"
            description="Your teacher hasn't scheduled any sessions yet."
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((session) => (
              <UpcomingSessionCard
                key={session.id}
                session={session}
                onJoin={() => handleJoin(session.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past Sessions */}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Past Sessions</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((session) => (
              <div key={session.id} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium truncate">{session.title}</h3>
                  <SessionStatusBadge status={session.status} />
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {session.subjectId.name} · {session.classId.name}
                </p>
                {session.recordingUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/classroom/${session.id}`)}
                  >
                    <Video className="mr-2 h-3 w-3" />
                    Watch Recording
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
