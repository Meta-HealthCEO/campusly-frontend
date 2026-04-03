'use client';

import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
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
import { ScreenShareView } from '@/components/classroom/ScreenShareView';
import { SessionStatusBadge } from '@/components/classroom/SessionStatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useClassroomSessions } from '@/hooks/useClassroomSessions';
import { useAuthStore } from '@/stores/useAuthStore';

interface ChatMessage {
  userId: string;
  name: string;
  text: string;
  timestamp: string;
}

interface HandRaiseEntry {
  userId: string;
  name: string;
  raisedAt: string;
}

export default function LiveClassroomPage() {
  const params = useParams();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';

  const { user } = useAuthStore();
  const { sessions, loading, endSession, startSession } = useClassroomSessions();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hands, setHands] = useState<HandRaiseEntry[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [respondedPolls, setRespondedPolls] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'whiteboard' | 'participants'>('participants');

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const handleSendMessage = useCallback((text: string) => {
    if (!user) return;
    setMessages((prev) => [
      ...prev,
      {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        text,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [user]);

  const handleRaiseHand = useCallback(() => {
    if (!user) return;
    if (handRaised) {
      setHands((prev) => prev.filter((h) => h.userId !== user.id));
      setHandRaised(false);
    } else {
      setHands((prev) => [
        ...prev,
        { userId: user.id, name: `${user.firstName} ${user.lastName}`, raisedAt: new Date().toISOString() },
      ]);
      setHandRaised(true);
    }
  }, [handRaised, user]);

  const handleLowerHand = useCallback((userId: string) => {
    setHands((prev) => prev.filter((h) => h.userId !== userId));
  }, []);

  const handleCreatePoll = useCallback(async (_question: string, _options: string[]) => {
    // Integrate with backend poll creation via sessions API
  }, []);

  const handleRespondPoll = useCallback(async (pollId: string, _answer: number) => {
    setRespondedPolls((prev) => new Set(prev).add(pollId));
  }, []);

  const handleEnd = useCallback(async () => {
    if (!session) return;
    try { await endSession(session.id); } catch (err: unknown) {
      console.error('Failed to end session', err);
    }
  }, [session, endSession]);

  const handleStart = useCallback(async () => {
    if (!session) return;
    try { await startSession(session.id); } catch (err: unknown) {
      console.error('Failed to start session', err);
    }
  }, [session, startSession]);

  if (loading) return <LoadingSpinner />;

  if (!session) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Session not found"
        description="This classroom session does not exist or has been removed."
      />
    );
  }

  const activePoll = session.polls[session.polls.length - 1] ?? null;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold truncate">{session.title}</h1>
            <SessionStatusBadge status={session.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {session.subjectId.name} · {session.classId.name}
          </p>
        </div>
        {isTeacher && session.status === 'scheduled' && (
          <button
            onClick={handleStart}
            className="self-start sm:self-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start Session
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left — video + controls */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          {isSharing ? (
            <ScreenShareView
              isSharing={isSharing}
              sharerName={`${session.teacherId.firstName} ${session.teacherId.lastName}`}
            />
          ) : (
            <VideoRoom
              session={session}
              isTeacher={isTeacher}
              participantCount={0}
            />
          )}

          {/* Tab toggle: whiteboard / participants */}
          <div className="flex gap-2 flex-wrap">
            {(['participants', 'whiteboard'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'participants' && (
            <ParticipantGrid participants={[]} />
          )}
          {activeTab === 'whiteboard' && (
            <SharedWhiteboard sessionId={session.id} />
          )}

          {/* Controls */}
          {isTeacher ? (
            <TeacherControls
              session={session}
              onEnd={handleEnd}
              onToggleMute={() => setAudioMuted((v) => !v)}
              onShareScreen={() => setIsSharing((v) => !v)}
              onCreatePoll={() => setPollOpen(true)}
            />
          ) : (
            <StudentControls
              handRaised={handRaised}
              audioMuted={audioMuted}
              onRaiseHand={handleRaiseHand}
              onToggleAudio={() => setAudioMuted((v) => !v)}
            />
          )}

          {/* Active poll for student */}
          {!isTeacher && activePoll && (
            <LivePollResponder
              poll={activePoll}
              responded={respondedPolls.has(activePoll._id)}
              onRespond={(answer) => handleRespondPoll(activePoll._id, answer)}
            />
          )}
        </div>

        {/* Right sidebar — chat + hand queue */}
        <div className="flex flex-col gap-4 w-full lg:w-80 shrink-0">
          <div className="flex-1 min-h-[300px]">
            <SessionChat messages={messages} onSend={handleSendMessage} />
          </div>
          {isTeacher && (
            <HandRaiseQueue hands={hands} onLower={handleLowerHand} />
          )}
        </div>
      </div>

      {/* Poll creator dialog (teacher only) */}
      {isTeacher && (
        <LivePollCreator
          open={pollOpen}
          onOpenChange={setPollOpen}
          onSubmit={handleCreatePoll}
        />
      )}
    </div>
  );
}
