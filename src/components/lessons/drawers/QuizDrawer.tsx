'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
import { useQuizzesPicker } from '@/hooks/useLessonResourcePickers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { QuizMaterial } from '@/types/lesson';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: QuizMaterial;
}

function refId(ref: QuizMaterial['quizId'] | undefined): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id ?? ref.id ?? '';
}

export function QuizDrawer({ onSubmit, existing }: Props) {
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);
  const { items, loading } = useQuizzesPicker();
  const isStandalone = useAuthStore((s) => s.permissions.isStandaloneTeacher);

  const [quizId, setQuizId] = useState<string>(refId(existing?.quizId));
  const [title, setTitle] = useState<string>(existing?.title ?? '');
  const [teacherNotes, setTeacherNotes] = useState<string>(existing?.teacherNotes ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setQuizId(refId(existing.quizId));
    setTitle(existing.title);
    setTeacherNotes(existing.teacherNotes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?._id]);

  const selected = useMemo(
    () => items.find((q) => q.id === quizId) ?? null,
    [items, quizId],
  );

  const handleQuizChange = (val: string | null) => {
    const next = val ?? '';
    setQuizId(next);
    const q = items.find((x) => x.id === next);
    if (q && !title.trim()) setTitle(q.title);
  };

  const canSubmit = !!quizId && !!title.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        kind: 'quiz',
        title: title.trim(),
        teacherNotes: teacherNotes.trim() || undefined,
        quizId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (items.length === 0) {
    if (isStandalone) {
      return (
        <EmptyState
          icon={ListChecks}
          title="Quizzes aren't available on your plan"
          description="The Quiz material kind belongs to the multi-school Learning module. Use Practice Questions for inline AI questions, or a Test Paper for a full structured test."
          action={<Button onClick={closeDrawer}>Close</Button>}
        />
      );
    }
    return (
      <EmptyState
        icon={ListChecks}
        title="No quizzes available"
        description="Create a quiz in the Learning module first, then come back here to link it."
        action={
          <Link href="/teacher/learning">
            <Button>Go to Learning</Button>
          </Link>
        }
      />
    );
  }

  const actionLabel = existing ? 'Update quiz' : 'Add quiz';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="quiz-pick">
          Quiz <span className="text-destructive">*</span>
        </Label>
        <Select value={quizId} onValueChange={handleQuizChange}>
          <SelectTrigger id="quiz-pick" className="w-full">
            <SelectValue placeholder="Select a quiz to link" />
          </SelectTrigger>
          <SelectContent>
            {items.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                <div className="flex flex-col">
                  <span className="truncate">{q.title}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {q.subtitle}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {selected.subtitle}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="quiz-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="quiz-title"
          className="w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="How this quiz appears in the lesson"
        />
      </div>

      <div>
        <Label htmlFor="quiz-notes">Teacher notes</Label>
        <Textarea
          id="quiz-notes"
          className="w-full min-h-20"
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          placeholder="What should learners focus on?"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Saving\u2026' : actionLabel}
        </Button>
      </div>
    </div>
  );
}
