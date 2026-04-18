'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { VideoRoom } from '@/components/classroom/VideoRoom';
import { SessionChat } from '@/components/classroom/SessionChat';
import { TeacherControls } from '@/components/classroom/TeacherControls';
import { StudentControls } from '@/components/classroom/StudentControls';
import { HandRaiseQueue } from '@/components/classroom/HandRaiseQueue';
import { LivePollCreator } from '@/components/classroom/LivePollCreator';
import { LivePollResponder } from '@/components/classroom/LivePollResponder';
import { SharedWhiteboard } from '@/components/classroom/SharedWhiteboard';
import { ParticipantGrid } from '@/components/classroom/ParticipantGrid';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useClassroomSessions } from '@/hooks/useClassroomSessions';
import type { JoinData } from '@/hooks/useClassroomSessions';
import { useClassroomSocket } from '@/hooks/useClassroomSocket';
import { useClassroomRecording } from '@/hooks/useClassroomRecording';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LiveClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';

  const { user } = useAuthStore();
  const { endSession, getJoinToken } = useClassroomSessions();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [joinData, setJoinData] = useState<JoinData | null>(null);
  const [sidebarTab, setSidebarTab] = useState('chat');
  const [handRaised, setHandRaised] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCreatorOpen, setPollCreatorOpen] = useState(false);

  /* Socket connection — only active once we have join data */
  const socket = useClassroomSocket(joinData ? sessionId : null);

  /* Recording controls — only relevant for teacher */
  const {
    isRecording,
    formattedDuration,
    startRecording,
    stopRecording,
  } = useClassroomRecording(joinData && isTeacher ? sessionId : null);

  /* Fetch join data on mount */
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function fetchJoinData() {
      try {
        const data = await getJoinToken(sessionId);
        if (!cancelled) setJoinData(data);
      } catch (err: unknown) {
        console.error('Failed to fetch join data', err);
        if (!cancelled) setError('Unable to join this session. It may have ended or you lack permission.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJoinData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  /* Track local hand-raise state from socket */
  useEffect(() => {
    if (!user?.id) return;
    const raised = socket.raisedHands.some((h) => h.userId === user.id);
    setHandRaised(raised);
  }, [socket.raisedHands, user?.id]);

  const handleEnd = useCallback(async () => {
    try {
      await endSession(sessionId);
      router.push('/teacher/classroom');
    } catch (err: unknown) {
      console.error('Failed to end session', err);
    }
  }, [sessionId, endSession, router]);

  const handleCreatePoll = useCallback(
    (question: string, options: string[]) => {
      socket.createPoll(question, options);
      setPollCreatorOpen(false);
    },
    [socket],
  );

  if (loading) return <LoadingSpinner />;

  if (error || !joinData) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Cannot join session"
        description={error ?? 'Session data could not be loaded.'}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Main content — two columns on desktop, stacked on mobile */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left — video + controls */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <VideoRoom
            token={joinData.token}
            serverUrl={joinData.livekitUrl}
            isTeacher={isTeacher}
            onDisconnected={() => router.push('/teacher/classroom')}
          />

          {/* Controls bar */}
          {isTeacher ? (
            <TeacherControls
              onEnd={handleEnd}
              onCreatePoll={() => setPollCreatorOpen(true)}
              isRecording={isRecording}
              recordingDuration={formattedDuration}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
            />
          ) : (
            <StudentControls
              handRaised={handRaised}
              onRaiseHand={socket.raiseHand}
              onLowerHand={socket.lowerHand}
            />
          )}
        </div>

        {/* Right sidebar — tabbed panels */}
        <div className="flex flex-col gap-2 w-full lg:w-80 shrink-0 min-h-0">
          <Tabs value={sidebarTab} onValueChange={setSidebarTab}>
            <TabsList className="w-full flex-wrap">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="polls">Polls</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="min-h-[300px]">
              <SessionChat
                messages={socket.messages}
                onSend={socket.sendMessage}
                currentUserId={user?.id ?? ''}
              />
            </TabsContent>

            <TabsContent value="people">
              <ParticipantGrid />
              <HandRaiseQueue
                hands={socket.raisedHands}
                isTeacher={isTeacher}
                onLower={socket.lowerHand}
              />
            </TabsContent>

            <TabsContent value="board" className="min-h-[400px]">
              <SharedWhiteboard sessionId={sessionId} readOnly={!isTeacher} />
            </TabsContent>

            <TabsContent value="polls">
              {isTeacher && !pollCreatorOpen && !socket.activePoll && (
                <button
                  onClick={() => setPollCreatorOpen(true)}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create Poll
                </button>
              )}
              {pollCreatorOpen && isTeacher && (
                <LivePollCreator onCreatePoll={handleCreatePoll} />
              )}
              {socket.activePoll && (
                <LivePollResponder
                  poll={socket.activePoll}
                  responses={socket.pollResponses}
                  currentUserId={user?.id ?? ''}
                  onRespond={socket.respondPoll}
                  isTeacher={isTeacher}
                  onEndPoll={isTeacher ? socket.endPoll : undefined}
                />
              )}
              {!pollCreatorOpen && !socket.activePoll && !isTeacher && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No active poll right now.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
