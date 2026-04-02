'use client';

import { useEffect, useState } from 'react';
import { Menu, Sparkles } from 'lucide-react';
import Link from 'next/link';
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
import type { SendMessagePayload } from '@/types';

export default function StudentAITutorPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const {
    conversations,
    currentConversation,
    sending,
    loading,
    loadConversations,
    loadConversation,
    sendMessage,
    startNewConversation,
  } = useAITutor();

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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

  const handleSend = (message: string) => {
    const payload: SendMessagePayload = {
      conversationId: currentConversation?.id,
      subjectId: selectedSubjectId || currentConversation?.subjectId || '',
      subjectName: selectedSubjectName || currentConversation?.subjectName || '',
      grade,
      message,
      mode: 'chat',
    };
    sendMessage(payload);
  };

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
    setSidebarOpen(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
    setSidebarOpen(false);
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

      {!currentConversation && (
        <SubjectSelector
          subjects={subjects}
          selected={selectedSubjectId}
          onSelect={(id, name) => {
            setSelectedSubjectId(id);
            setSelectedSubjectName(name);
          }}
        />
      )}

      <div className="flex h-[calc(100vh-16rem)] gap-4">
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
          />
        </div>
      </div>
    </div>
  );
}
