'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ListChecks, ExternalLink } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useQuestionBankLibrary } from '@/hooks/useQuestionBankLibrary';
import type { StagedExerciseHomework } from '@/types';

interface ExercisePickerProps {
  classId: string;
  subjectId: string;
  schoolId: string;
  initialTitle?: string;
  onPicked: (hw: StagedExerciseHomework) => void;
}

export function ExercisePicker({
  classId,
  subjectId,
  schoolId,
  initialTitle,
  onPicked,
}: ExercisePickerProps) {
  const [search, setSearch] = useState<string>('');
  const { questions, loading } = useQuestionBankLibrary({
    subjectId,
    q: search,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState<string>(initialTitle ?? '');
  const [dueDate, setDueDate] = useState<string>('');

  const selectedQuestions = questions.filter((q) => selected.includes(q._id));
  const totalMarks = selectedQuestions.reduce(
    (sum: number, q) => sum + (q.marks ?? 1),
    0,
  );
  const canSubmit = Boolean(selected.length > 0 && title.trim() && dueDate);

  const toggle = (id: string): void => {
    setSelected((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = (): void => {
    onPicked({
      type: 'exercise',
      exerciseQuestionIds: selected,
      title: title.trim(),
      schoolId,
      subjectId,
      classId,
      dueDate: new Date(dueDate).toISOString(),
      totalMarks,
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="exercise-hw-search">Search Question Bank</Label>
        <Input
          id="exercise-hw-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. simplify fractions"
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading questions...</p>
      )}

      {!loading && questions.length === 0 && (
        <div className="text-center py-6 space-y-3 border border-dashed rounded-md">
          <ListChecks className="h-8 w-8 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <p className="font-medium text-sm">No questions found</p>
            <p className="text-xs text-muted-foreground">
              {search.trim()
                ? 'Try a different search term, or add questions to the Question Bank.'
                : 'Add questions to the Question Bank to build exercise sets.'}
            </p>
          </div>
          <Link
            href="/teacher/curriculum/questions"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Add questions <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-2">
          <Label>
            Questions <span className="text-destructive">*</span>
          </Label>
          <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
            {questions.map((q) => (
              <label
                key={q._id}
                className="flex items-start gap-2 p-2 cursor-pointer hover:bg-muted"
              >
                <Checkbox
                  checked={selected.includes(q._id)}
                  onCheckedChange={() => toggle(q._id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm line-clamp-2">{q.stem}</div>
                  <div className="text-xs text-muted-foreground">
                    {q.marks} pts
                    {typeof q.difficulty === 'number'
                      ? ` · difficulty ${q.difficulty}`
                      : ''}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="exercise-hw-title">
          Homework Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="exercise-hw-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Fractions Exercise Set"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exercise-hw-due">
          Due Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="exercise-hw-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Selected: {selected.length} question(s) · {totalMarks} marks
      </p>

      <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
        Add Exercise Homework
      </Button>
    </div>
  );
}
