'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Video, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  UpcomingSessionCard,
  SessionScheduler,
  VideoUploadForm,
  VideoCard,
} from '@/components/classroom';
import { useClassroomSessions } from '@/hooks/useClassroomSessions';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import type { CreateClassroomSessionPayload, CreateVideoPayload } from '@/types';

export default function TeacherClassroomPage() {
  const router = useRouter();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const {
    sessions,
    loading: sessionsLoading,
    fetchSessions,
    createSession,
    startSession,
  } = useClassroomSessions();

  const {
    videos,
    loading: videosLoading,
    fetchVideos,
    createVideo,
  } = useVideoLibrary();

  const handleCreateSession = useCallback(async (data: CreateClassroomSessionPayload) => {
    try {
      await createSession(data);
      toast.success('Session scheduled successfully');
      setScheduleOpen(false);
      fetchSessions();
    } catch (err: unknown) {
      console.error('Failed to schedule session', err);
      toast.error('Failed to schedule session');
    }
  }, [createSession, fetchSessions]);

  const handleStartSession = useCallback(async (sessionId: string) => {
    setActioningId(sessionId);
    try {
      await startSession(sessionId);
      router.push(`/classroom/${sessionId}`);
    } catch (err: unknown) {
      console.error('Failed to start session', err);
      toast.error('Failed to start session');
      setActioningId(null);
    }
  }, [startSession, router]);

  const handleUploadVideo = useCallback(async (data: CreateVideoPayload) => {
    try {
      await createVideo(data);
      toast.success('Video uploaded successfully');
      setUploadOpen(false);
      fetchVideos();
    } catch (err: unknown) {
      console.error('Failed to upload video', err);
      toast.error('Failed to upload video');
    }
  }, [createVideo, fetchVideos]);

  return (
    <div className="space-y-8">
      <PageHeader title="Virtual Classroom" description="Manage your live sessions and video library">
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogTrigger render={<Button><CalendarPlus className="mr-2 h-4 w-4" />Schedule Session</Button>} />
          <DialogContent className="flex flex-col max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Schedule Session</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <SessionScheduler onSubmit={handleCreateSession} />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger render={<Button variant="outline"><Video className="mr-2 h-4 w-4" />Upload Video</Button>} />
          <DialogContent className="flex flex-col max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Upload Video</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <VideoUploadForm onSubmit={handleUploadVideo} />
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Upcoming Sessions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Upcoming Sessions</h2>
        {sessionsLoading ? (
          <LoadingSpinner />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="No sessions scheduled"
            description="Schedule your first virtual classroom session to get started."
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <UpcomingSessionCard
                key={session.id}
                session={session}
                onStart={
                  actioningId === session.id
                    ? undefined
                    : () => handleStartSession(session.id)
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Video Library */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">My Videos</h2>
        {videosLoading ? (
          <LoadingSpinner />
        ) : videos.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No videos yet"
            description="Upload your first video lesson to build your library."
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
