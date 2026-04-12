'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Search,
  FileText,
  BookOpen,
  ClipboardList,
  HelpCircle,
  X,
} from 'lucide-react';
import {
  useCourseResourcePicker,
  type ResourcePickerResult,
} from '@/hooks/useCourseResourcePicker';
import type { CreateLessonInput } from '@/hooks/useCourseBuilder';

type LessonKind = ResourcePickerResult['kind'];

interface ResourcePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string | null;
  /**
   * Called with the shaped CreateLessonInput when the teacher picks a
   * resource (or commits a quiz question set). Caller should await the
   * mutation and close the dialog on success.
   */
  onPick: (input: CreateLessonInput) => Promise<void>;
}

const KIND_CONFIG: Record<
  LessonKind,
  { icon: typeof FileText; label: string }
> = {
  content: { icon: FileText, label: 'Content' },
  chapter: { icon: BookOpen, label: 'Chapter' },
  homework: { icon: ClipboardList, label: 'Homework' },
  quiz_question: { icon: HelpCircle, label: 'Quiz Q' },
};

/**
 * Fuzzy-search dialog for adding a lesson to a course module. Searches
 * ContentLibrary, Textbook chapters, Homework, and Question Bank in
 * parallel. For single-source picks (content / chapter / homework), the
 * teacher clicks a result and the lesson is added immediately. For quiz
 * questions, the teacher selects one or more questions and then clicks
 * "Create quiz lesson" — the selected questions are bundled into a
 * single quiz lesson.
 */
export function ResourcePickerDialog({
  open,
  onOpenChange,
  moduleId,
  onPick,
}: ResourcePickerDialogProps) {
  const { query, setQuery, results, loading, reset } =
    useCourseResourcePicker();
  const [selectedQuestions, setSelectedQuestions] = useState<
    ResourcePickerResult[]
  >([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) {
      reset();
      setSelectedQuestions([]);
    }
  }, [open, reset]);

  const handlePickSingle = async (result: ResourcePickerResult) => {
    if (!moduleId) return;
    if (result.kind === 'quiz_question') {
      // Quiz questions accumulate into a batch.
      setSelectedQuestions((prev) =>
        prev.some((q) => q.id === result.id) ? prev : [...prev, result],
      );
      return;
    }

    setAdding(true);
    try {
      const input = buildSingleLessonInput(moduleId, result);
      if (input) await onPick(input);
    } finally {
      setAdding(false);
    }
  };

  const handleCreateQuizLesson = async () => {
    if (!moduleId || selectedQuestions.length === 0) return;
    setAdding(true);
    try {
      const input: CreateLessonInput = {
        moduleId,
        title: `Quiz (${selectedQuestions.length} question${selectedQuestions.length === 1 ? '' : 's'})`,
        type: 'quiz',
        quizQuestionIds: selectedQuestions.map((q) => q.id),
        isRequiredToAdvance: true,
        passMarkPercent: 70,
        maxAttempts: null,
        isGraded: true,
      };
      await onPick(input);
    } finally {
      setAdding(false);
    }
  };

  const removeSelectedQuestion = (id: string) => {
    setSelectedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Add Lesson</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search content, textbooks, homework, questions..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Selected questions chip bar */}
        {selectedQuestions.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-2">
            <p className="text-xs text-muted-foreground mb-2">
              {selectedQuestions.length} question
              {selectedQuestions.length === 1 ? '' : 's'} selected for quiz
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedQuestions.map((q) => (
                <Badge
                  key={q.id}
                  variant="secondary"
                  className="gap-1 max-w-xs"
                >
                  <span className="truncate">{q.title.slice(0, 40)}</span>
                  <button
                    type="button"
                    onClick={() => removeSelectedQuestion(q.id)}
                    aria-label="Remove"
                    className="hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {loading && <LoadingSpinner />}
          {!loading && query.trim().length < 2 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Type at least 2 characters to search.
            </p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <EmptyState
              icon={Search}
              title="No results"
              description="Try a different search term or create the content in Content Library first."
            />
          )}
          {!loading && results.length > 0 && (
            <div className="space-y-1 py-2">
              {results.map((result) => (
                <ResourceRow
                  key={`${result.kind}-${result.id}`}
                  result={result}
                  selected={
                    result.kind === 'quiz_question' &&
                    selectedQuestions.some((q) => q.id === result.id)
                  }
                  disabled={adding}
                  onPick={() => void handlePickSingle(result)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adding}
          >
            Cancel
          </Button>
          {selectedQuestions.length > 0 && (
            <Button onClick={() => void handleCreateQuizLesson()} disabled={adding}>
              {adding
                ? 'Creating...'
                : `Create quiz with ${selectedQuestions.length} question${selectedQuestions.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Subcomponents + helpers ──────────────────────────────────────────

function ResourceRow({
  result,
  selected,
  disabled,
  onPick,
}: {
  result: ResourcePickerResult;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const { icon: Icon, label } = KIND_CONFIG[result.kind];
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'hover:bg-muted/50 disabled:opacity-50'
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{result.title}</p>
        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {label}
      </Badge>
    </button>
  );
}

function buildSingleLessonInput(
  moduleId: string,
  result: ResourcePickerResult,
): CreateLessonInput | null {
  if (result.kind === 'content') {
    return {
      moduleId,
      title: result.title,
      type: 'content',
      contentResourceId: result.id,
      isRequiredToAdvance: false,
    };
  }
  if (result.kind === 'chapter') {
    return {
      moduleId,
      title: result.title,
      type: 'chapter',
      textbookId: result.textbookId,
      chapterId: result.chapterId,
      isRequiredToAdvance: false,
    };
  }
  if (result.kind === 'homework') {
    return {
      moduleId,
      title: result.title,
      type: 'homework',
      homeworkId: result.id,
      isRequiredToAdvance: false,
    };
  }
  // quiz_question is handled via the batch selection flow, not here.
  return null;
}
