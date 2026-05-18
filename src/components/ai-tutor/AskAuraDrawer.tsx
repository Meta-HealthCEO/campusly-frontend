'use client';

import { ReactElement, useEffect, useState } from 'react';
import type { JSXElementConstructor } from 'react';
import { Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChatInterface } from './ChatInterface';
import { useAITutor } from '@/hooks/useAITutor';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { resolveGradeLevel } from '@/lib/student-helpers';
import type { AuraContext, AuraImagePayload, SendMessagePayload, TutorMode } from '@/types';

interface AskAuraDrawerProps {
  /** The element that opens the drawer. Defaults to a "Ask Aura" outline button. */
  trigger?: ReactElement<unknown, string | JSXElementConstructor<unknown>>;
  subjectId: string;
  subjectName: string;
  /** Tutoring mode - derived from surface if not specified. */
  mode?: TutorMode;
  context: AuraContext;
}

function defaultModeForSurface(surface: AuraContext['surface']): TutorMode {
  switch (surface) {
    case 'homework':
    case 'assignment_review':
      return 'homework_help';
    case 'test_review':
    case 'lesson':
    case 'lesson_material':
      return 'chat';
    default:
      return 'chat';
  }
}

function contextHeading(ctx: AuraContext): string {
  switch (ctx.surface) {
    case 'homework':
      return ctx.title ? `Homework: ${ctx.title}` : 'Homework help';
    case 'lesson':
    case 'lesson_material':
      return ctx.title ? `Lesson: ${ctx.title}` : 'Lesson help';
    case 'test_review':
      return ctx.title ? `Test review: ${ctx.title}` : 'Test review';
    case 'assignment_review':
      return ctx.title ? `Assignment review: ${ctx.title}` : 'Assignment review';
    default:
      return 'Ask Aura';
  }
}

/**
 * Embedded AI tutor drawer. Drop into any study surface (homework page,
 * lesson page, test review page) to give students contextual help without
 * sending them to a separate route. Aura receives the surface context so
 * its replies are anchored to what the student is currently looking at.
 */
export function AskAuraDrawer({
  trigger,
  subjectId,
  subjectName,
  mode,
  context,
}: AskAuraDrawerProps) {
  const [open, setOpen] = useState(false);
  const { student } = useCurrentStudent();
  const { homeroom } = useStudentClasses();
  const {
    currentConversation,
    sending,
    streamingText,
    sendMessage,
    sendMessageStream,
    startNewConversation,
  } = useAITutor();

  const grade = resolveGradeLevel(student, homeroom);
  const effectiveMode = mode ?? defaultModeForSurface(context.surface);
  const canChat = Boolean(subjectId && subjectName && grade >= 1);

  // Reset chat state every time the drawer is closed so reopening on a
  // different page (or the same page but a different question) starts clean.
  useEffect(() => {
    if (!open) startNewConversation();
  }, [open, startNewConversation]);

  const handleSend = (message: string, image?: AuraImagePayload) => {
    if (!canChat) return;
    const payload: SendMessagePayload = {
      conversationId: currentConversation?.id,
      subjectId,
      subjectName,
      grade,
      message,
      mode: effectiveMode,
      context,
      image,
    };
    if (image) {
      void sendMessage(payload);
    } else {
      void sendMessageStream(payload);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          trigger ?? (
            <Button variant="outline" className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Ask Aura
            </Button>
          )
        }
      />
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg md:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Aura
          </SheetTitle>
          <p className="truncate text-xs text-muted-foreground">
            {contextHeading(context)} - {subjectName} - {modeLabel(effectiveMode)}
            {context.isAssessmentActive && ' - live assessment'}
          </p>
        </SheetHeader>
        <div className="flex flex-1 overflow-hidden">
          <ChatInterface
            conversation={currentConversation}
            onSend={handleSend}
            sending={sending}
            canChat={canChat}
            streamingText={streamingText}
            mode={effectiveMode}
            subjectName={subjectName}
            grade={grade}
            modeLabel={modeLabel(effectiveMode)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function modeLabel(mode: TutorMode): string {
  switch (mode) {
    case 'homework_help':
      return 'Hints only';
    case 'practice':
      return 'Practice';
    case 'exam_prep':
      return 'Exam prep';
    default:
      return 'Explain';
  }
}
