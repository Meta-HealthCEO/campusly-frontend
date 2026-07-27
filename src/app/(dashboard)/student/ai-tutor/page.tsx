'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  Lightbulb,
  Sparkles,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAITutor } from '@/hooks/useAITutor';
import { useSubjects } from '@/hooks/useAcademics';
import { useCapsGrades, useCapsSubjects } from '@/hooks/useCapsGrades';
import { useCurriculumTopicTree } from '@/hooks/useCurriculumTopics';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChatInterface } from '@/components/ai-tutor/ChatInterface';
import { AuraHeader, type AuraModeOption } from '@/components/ai-tutor/AuraHeader';
import { type TopicOption } from '@/components/ai-tutor/TutorChips';
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

const MODE_OPTIONS: AuraModeOption[] = [
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
  const { subjects: capsSubjects, loading: capsSubjectsLoading } = useCapsSubjects(capsGradeNodeId, frameworkId);

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

  // Optional CAPS-aligned topic narrowing. `selectedTopicId` is set only when
  // the student picks a structured syllabus topic; `customTopic` is set when
  // they type a free-text topic instead. Either or neither may be set.
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedTopicTitle, setSelectedTopicTitle] = useState('');
  const [customTopic, setCustomTopic] = useState('');

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

  // Load topics from the same source the teacher's lesson generator uses:
  // school subjectId + school gradeId. This guarantees the student sees the
  // exact topic catalogue their teacher works against, not a CAPS-framework
  // subset.
  const activeSubjectIdForLookup = currentConversation?.subjectId ?? selectedSubjectId;
  const { tree: curriculumTopicTree, loading: topicsLoading } = useCurriculumTopicTree({
    subjectId: activeSubjectIdForLookup,
    gradeId: studentGradeId,
  });

  const topicOptions = useMemo<TopicOption[]>(
    () =>
      curriculumTopicTree.map((node) => ({
        id: node.id,
        title: node.title,
        code: node.code,
        subtopics: node.subtopics,
      })),
    [curriculumTopicTree],
  );

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

  const effectiveTopicTitle = customTopic || selectedTopicTitle;
  const effectiveTopicNodeId = customTopic ? '' : selectedTopicId;

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
      // Only attach a context object when the student actually narrowed the
      // syllabus topic — keeps free-form chats lean.
      context: effectiveTopicTitle
        ? {
            surface: 'free',
            topic: effectiveTopicTitle,
            curriculumNodeId: effectiveTopicNodeId || undefined,
          }
        : undefined,
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
    // Switching subject invalidates the previous topic pick.
    setSelectedTopicId('');
    setSelectedTopicTitle('');
    setCustomTopic('');
  };

  const handleSwitchMode = (mode: TutorMode) => {
    if (currentConversation) startNewConversation();
    setSelectedMode(mode);
  };

  const handleSelectTopic = (id: string, title: string) => {
    setSelectedTopicId(id);
    setSelectedTopicTitle(title);
    setCustomTopic('');
  };

  const handleSelectCustomTopic = (title: string) => {
    setSelectedTopicId('');
    setSelectedTopicTitle('');
    setCustomTopic(title);
  };

  const handleClearTopic = () => {
    setSelectedTopicId('');
    setSelectedTopicTitle('');
    setCustomTopic('');
  };

  const practiceHref = effectiveSubjectId
    ? `/student/ai-tutor/practice?subjectId=${effectiveSubjectId}`
    : '/student/ai-tutor/practice';

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-4xl flex-col">
      <AuraHeader
        subjects={tutorSubjects}
        effectiveSubjectId={effectiveSubjectId}
        effectiveSubjectName={effectiveSubjectName}
        grade={grade}
        onSwitchSubject={handleSwitchSubject}
        topicOptions={topicOptions}
        selectedTopicId={selectedTopicId}
        selectedTopicTitle={selectedTopicTitle}
        customTopic={customTopic}
        onSelectTopic={handleSelectTopic}
        onSelectCustomTopic={handleSelectCustomTopic}
        onClearTopic={handleClearTopic}
        topicsLoading={topicsLoading}
        modeOptions={MODE_OPTIONS}
        activeMode={activeMode}
        onSwitchMode={handleSwitchMode}
        onNewConversation={handleNewConversation}
        historyOpen={historyOpen}
        setHistoryOpen={setHistoryOpen}
        conversations={conversations}
        activeConversationId={currentConversation?.id}
        onSelectConversation={handleSelectConversation}
        practiceHref={practiceHref}
        onNavigate={(href) => router.push(href)}
      />

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
