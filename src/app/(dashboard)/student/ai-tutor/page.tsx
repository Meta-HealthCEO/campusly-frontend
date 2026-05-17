'use client';

import { useEffect, useState } from 'react';
import { Menu, Sparkles, BookOpen, Lightbulb, Target, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAITutor } from '@/hooks/useAITutor';
import { useSubjects } from '@/hooks/useAcademics';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChatInterface } from '@/components/ai-tutor/ChatInterface';
import { ConversationList } from '@/components/ai-tutor/ConversationList';
import { SubjectSelector } from '@/components/ai-tutor/SubjectSelector';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { BuddyImagePayload, SendMessagePayload, TutorMode } from '@/types';

const MODES: Array<{ id: TutorMode; label: string; description: string; icon: typeof BookOpen }> = [
  { id: 'chat', label: 'Explain', description: 'Teach me a concept', icon: BookOpen },
  { id: 'homework_help', label: 'Homework help', description: 'I\'m stuck — give me hints, not the answer', icon: Lightbulb },
  { id: 'practice', label: 'Practice', description: 'Drill me with questions', icon: Target },
  { id: 'exam_prep', label: 'Exam prep', description: 'Help me get ready for a test', icon: GraduationCap },
];

export default function StudentAITutorPage() {
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get('subjectId') ?? '';
  const initialContext = searchParams.get('context') ?? '';
  const initialModeParam = searchParams.get('mode') ?? '';
  const initialMode: TutorMode = (['chat', 'homework_help', 'practice', 'exam_prep'] as TutorMode[]).includes(
    initialModeParam as TutorMode,
  )
    ? (initialModeParam as TutorMode)
    : 'chat';

  const { student, loading: studentLoading } = useCurrentStudent();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const {
    conversations,
    currentConversation,
    sending,
    streamingText,
    loadConversations,
    loadConversation,
    sendMessage,
    sendMessageStream,
    startNewConversation,
  } = useAITutor();

  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const [selectedMode, setSelectedMode] = useState<TutorMode>(initialMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (initialSubjectId && subjects.length > 0 && !selectedSubjectName) {
      const s = subjects.find((sub) => sub.id === initialSubjectId);
      if (s) setSelectedSubjectName(s.name);
    }
  }, [initialSubjectId, subjects, selectedSubjectName]);

  if (studentLoading || subjectsLoading) return <LoadingSpinner />;

  if (!student) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Student profile not found"
        description="We could not locate your student record."
      />
    );
  }

  const grade = student.grade?.level ?? 0;
  const effectiveSubjectId = selectedSubjectId || currentConversation?.subjectId || '';
  const effectiveSubjectName = selectedSubjectName || currentConversation?.subjectName || '';
  const activeMode: TutorMode = currentConversation?.mode ?? selectedMode;
  const canChat = Boolean(effectiveSubjectId && effectiveSubjectName && grade >= 1);

  const handleSend = (message: string, image?: BuddyImagePayload) => {
    if (!effectiveSubjectId || !effectiveSubjectName) {
      toast.error('Please select a subject first');
      return;
    }
    if (grade < 1) {
      toast.error('Your grade is missing on your profile — please ask an admin to set it.');
      return;
    }
    const payload: SendMessagePayload = {
      conversationId: currentConversation?.id,
      subjectId: effectiveSubjectId,
      subjectName: effectiveSubjectName,
      grade,
      message,
      mode: activeMode,
      image,
    };
    // Vision messages don't stream — Claude's vision API isn't streamed in v1.
    if (image) {
      void sendMessage(payload);
    } else {
      void sendMessageStream(payload);
    }
  };

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
    setSidebarOpen(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
    setSidebarOpen(false);
  };

  const handleSwitchSubject = (id: string, name: string) => {
    // Changing subject during an active chat is a deliberate "new conversation"
    // signal — keeping the same thread would mix grade-9 maths context into a
    // grade-11 history chat. Reset and let the next message create a fresh one.
    if (currentConversation) {
      startNewConversation();
    }
    setSelectedSubjectId(id);
    setSelectedSubjectName(name);
  };

  const sidebar = (
    <ConversationList
      conversations={conversations}
      activeId={currentConversation?.id}
      onSelect={handleSelectConversation}
      onNew={handleNewConversation}
    />
  );

  return (
    <div className="space-y-4">
      <PageHeader title="AI Tutor" description="Get help with your studies">
        <Link href="/student/ai-tutor/practice">
          <Button variant="outline" size="default">Practice Questions</Button>
        </Link>
      </PageHeader>

      {/* Subject selector — visible always; switching during a chat starts a new conversation */}
      <SubjectSelector
        subjects={subjects}
        selected={effectiveSubjectId}
        onSelect={handleSwitchSubject}
      />

      {/* Mode picker — only when starting a fresh chat. Locked once a thread exists. */}
      {!currentConversation && (
        <ModePicker selected={selectedMode} onSelect={setSelectedMode} />
      )}

      <div className="flex h-[calc(100vh-22rem)] gap-4">
        {/* Desktop sidebar */}
        <div className="hidden w-72 shrink-0 overflow-hidden rounded-lg border lg:block">
          {sidebar}
        </div>

        {/* Mobile sidebar via Sheet */}
        <div className="lg:hidden">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon" />}>
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Conversations</SheetTitle>
              </SheetHeader>
              {sidebar}
            </SheetContent>
          </Sheet>
        </div>

        {/* Chat */}
        <div className="flex flex-1 overflow-hidden rounded-lg border">
          <ChatInterface
            conversation={currentConversation}
            onSend={handleSend}
            sending={sending}
            canChat={canChat}
            streamingText={streamingText}
            initialPrompt={initialContext || undefined}
          />
        </div>
      </div>
    </div>
  );
}

interface ModePickerProps {
  selected: TutorMode;
  onSelect: (mode: TutorMode) => void;
}

function ModePicker({ selected, onSelect }: ModePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = mode.id === selected;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
              isActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-accent'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                {mode.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground line-clamp-2">
              {mode.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
