'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  History,
  Lightbulb,
  MessageSquarePlus,
  MoreHorizontal,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAITutor } from '@/hooks/useAITutor';
import { useSubjects } from '@/hooks/useAcademics';
import { useCapsGrades, useCapsSubjects } from '@/hooks/useCapsGrades';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChatInterface } from '@/components/ai-tutor/ChatInterface';
import { ConversationList } from '@/components/ai-tutor/ConversationList';
import { SubjectChip, ModeChip } from '@/components/ai-tutor/TutorChips';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  buildTutorSubjects,
  curriculumSubjectsToTutorSubjects,
  findCurriculumGradeNodeId,
} from '@/lib/ai-tutor-subjects';
import { resolveGradeId, resolveGradeLevel } from '@/lib/student-helpers';
import type {
  AuraImagePayload,
  SendMessagePayload,
  TutorMode,
} from '@/types';

const MODE_OPTIONS: Array<{
  id: TutorMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'chat',
    label: 'Explain',
    shortLabel: 'Explain',
    description: 'Clear teaching, then a check question.',
    icon: BookOpen,
  },
  {
    id: 'homework_help',
    label: 'Homework help',
    shortLabel: 'Homework',
    description: 'Hints first — you still do the thinking.',
    icon: Lightbulb,
  },
  {
    id: 'practice',
    label: 'Practise',
    shortLabel: 'Practise',
    description: 'One question at a time with feedback.',
    icon: Target,
  },
  {
    id: 'exam_prep',
    label: 'Exam prep',
    shortLabel: 'Exam prep',
    description: 'Revision plans and exam-style drilling.',
    icon: GraduationCap,
  },
];

export default function StudentAITutorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get('subjectId') ?? '';
  const initialContext = searchParams.get('context') ?? '';
  const initialModeParam = searchParams.get('mode') ?? '';
  const initialMode: TutorMode = MODE_OPTIONS.some((o) => o.id === initialModeParam)
    ? (initialModeParam as TutorMode)
    : 'chat';

  const { student, loading: studentLoading } = useCurrentStudent();
  const { homeroom, subjectClasses, loading: classesLoading } = useStudentClasses();
  const gradeSourceClass = homeroom ?? subjectClasses[0] ?? null;
  const studentGradeId = resolveGradeId(student, gradeSourceClass);
  const gradeLevel = resolveGradeLevel(student, gradeSourceClass);
  const { subjects, loading: subjectsLoading } = useSubjects(studentGradeId);
  const { grades: capsGrades, frameworkId, loading: capsGradesLoading } = useCapsGrades();
  const capsGradeNodeId = useMemo(
    () => findCurriculumGradeNodeId(capsGrades, gradeLevel),
    [capsGrades, gradeLevel],
  );
  const { subjects: capsSubjects, loading: capsSubjectsLoading } = useCapsSubjects(
    capsGradeNodeId,
    frameworkId,
  );

  const {
    conversations,
    currentConversation,
    sending,
    streamingText,
    loadConversations,
    loadConversation,
    sendMessage,
    sendMessageStream,
    stopStreaming,
    startNewConversation,
  } = useAITutor();

  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [selectedMode, setSelectedMode] = useState<TutorMode>(initialMode);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const tutorSubjects = useMemo(() => {
    const curriculumSubjects = curriculumSubjectsToTutorSubjects(capsSubjects);
    const subjectSource = curriculumSubjects.length > 0 ? curriculumSubjects : subjects;
    return buildTutorSubjects(
      subjectSource,
      homeroom,
      subjectClasses,
      currentConversation?.subjectId ?? selectedSubjectId,
    );
  }, [
    capsSubjects,
    currentConversation?.subjectId,
    homeroom,
    selectedSubjectId,
    subjectClasses,
    subjects,
  ]);

  if (studentLoading || subjectsLoading || classesLoading || capsGradesLoading || capsSubjectsLoading) {
    return <LoadingSpinner />;
  }

  if (!student) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Student profile not found"
        description="We could not locate your student record."
      />
    );
  }

  const grade = gradeLevel;
  const effectiveSubjectId = currentConversation?.subjectId ?? selectedSubjectId;
  const selectedSubject = tutorSubjects.find((subject) => subject.id === effectiveSubjectId);
  const effectiveSubjectName = currentConversation?.subjectName ?? selectedSubject?.name ?? '';
  const activeMode: TutorMode = currentConversation?.mode ?? selectedMode;
  const canChat = Boolean(effectiveSubjectId && effectiveSubjectName && grade >= 1);
  const activeModeMeta = MODE_OPTIONS.find((m) => m.id === activeMode) ?? MODE_OPTIONS[0];

  const handleSend = (message: string, image?: AuraImagePayload) => {
    if (!effectiveSubjectId || !effectiveSubjectName) {
      toast.error('Pick a subject first');
      return;
    }
    if (grade < 1) {
      toast.error('Your grade is missing. Join a class or ask your teacher to update your group.');
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
    if (image) {
      void sendMessage(payload);
    } else {
      void sendMessageStream(payload);
    }
  };

  const handleSelectConversation = (id: string) => {
    void loadConversation(id);
    setHistoryOpen(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
  };

  const handleSwitchSubject = (id: string) => {
    if (currentConversation) startNewConversation();
    setSelectedSubjectId(id);
  };

  const handleSwitchMode = (mode: TutorMode) => {
    if (currentConversation) startNewConversation();
    setSelectedMode(mode);
  };

  const practiceHref = effectiveSubjectId
    ? `/student/ai-tutor/practice?subjectId=${effectiveSubjectId}`
    : '/student/ai-tutor/practice';

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-4xl flex-col">
      {/* Slim header — Aura mark + two chips on the left, overflow on the right */}
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Aura</span>
          </div>
          <SubjectChip
            subjects={tutorSubjects}
            selectedId={effectiveSubjectId}
            selectedName={effectiveSubjectName}
            grade={grade}
            onSelect={handleSwitchSubject}
            disabled={tutorSubjects.length === 0}
          />
          <ModeChip
            options={MODE_OPTIONS}
            selectedId={activeMode}
            onSelect={handleSwitchMode}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* New session — visible on desktop, in overflow on mobile */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
            className="hidden sm:inline-flex"
            aria-label="New session"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span className="hidden md:inline">New</span>
          </Button>

          {/* History drawer trigger */}
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger render={<Button variant="ghost" size="sm" aria-label="History" />}>
              <History className="h-4 w-4" />
              <span className="hidden md:inline">History</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-85 p-0">
              <SheetHeader className="border-b p-4">
                <SheetTitle>Recent sessions</SheetTitle>
              </SheetHeader>
              <ConversationList
                conversations={conversations}
                activeId={currentConversation?.id}
                onSelect={handleSelectConversation}
                onNew={() => {
                  handleNewConversation();
                  setHistoryOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>

          {/* Overflow — mobile-only New + Practice link */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label="More" />}>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleNewConversation} className="sm:hidden">
                <MessageSquarePlus className="h-4 w-4" />
                New session
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(practiceHref)}>
                <Target className="h-4 w-4" />
                Practice drill
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/student/ai-tutor/practice/history')}>
                <History className="h-4 w-4" />
                Practice history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Chat fills the rest of the screen */}
      <div className="flex flex-1 min-h-0 flex-col">
        <ChatInterface
          conversation={currentConversation}
          onSend={handleSend}
          onQuickPrompt={(msg) => handleSend(msg)}
          onStop={stopStreaming}
          sending={sending}
          canChat={canChat}
          streamingText={streamingText}
          initialPrompt={initialContext || undefined}
          mode={activeMode}
          subjectName={effectiveSubjectName}
          grade={grade}
          modeLabel={activeModeMeta.shortLabel}
        />
      </div>
    </div>
  );
}
