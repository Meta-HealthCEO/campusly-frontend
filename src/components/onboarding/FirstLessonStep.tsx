'use client';

import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useTeacherClasses, type TeacherClassEntry } from '@/hooks/useTeacherClasses';
import { useUnitTopics } from '@/hooks/useUnitTopics';
import { resolveId } from '@/lib/api-helpers';
import { schoolTermFor } from '@/lib/course-unit';
import { firstLessonHref, firstTeachingTopic } from '@/lib/onboarding';
import { cn } from '@/lib/utils';
import type { PopulatedId } from '@/types';

interface FirstLessonStepProps {
  /** The class made in step 2, when the teacher has just made it. */
  preferredClassId: string | null;
}

/** Step 3: open the lesson builder on the teacher's class and this term's first CAPS topic. */
export function FirstLessonStep({ preferredClassId }: FirstLessonStepProps) {
  const { entries, loading } = useTeacherClasses();
  const withSubject = entries.filter((e: TeacherClassEntry) => e.subject);
  const entry = withSubject.find((e: TeacherClassEntry) => resolveId(e.class as unknown as PopulatedId) === preferredClassId)
    ?? withSubject[0] ?? null;
  const classId = entry ? resolveId(entry.class as unknown as PopulatedId) : '';
  const gradeId = entry ? resolveId(entry.class.gradeId as unknown as PopulatedId) : '';
  const term = schoolTermFor(new Date());
  const { topics, loading: topicsLoading } = useUnitTopics(entry?.subject?.id ?? '', gradeId, term);
  const topic = firstTeachingTopic(topics);
  const busy = loading || topicsLoading;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Your first lesson</h2>
        <p className="text-sm text-muted-foreground">
          The AI drafts a lesson from CAPS for your class. You check it before your learners see anything.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">Build your first lesson with AI</p>
            {busy ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Finding this term&apos;s topics…</p>
            ) : entry ? (
              <p className="text-sm text-muted-foreground">
                For {entry.class.name}{topic ? <>, starting with <span className="text-foreground">{topic.title}</span> (Term {term})</> : null}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Make a class first, then build a lesson for it.</p>
            )}
          </div>
        </div>
        {entry && !busy ? (
          <Link href={firstLessonHref(classId, topic?.id ?? null)} className={cn(buttonVariants(), 'mt-4 min-h-11 w-full gap-1.5 sm:w-auto')}>
            <Sparkles className="h-4 w-4" aria-hidden /> Build my first lesson
          </Link>
        ) : null}
      </div>
    </div>
  );
}
