'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { PracticeQuestionsMaterial } from '@/types/lesson';

type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'structured';
type CognitiveLevel = 'recall' | 'application' | 'analysis';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: PracticeQuestionsMaterial;
}

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short answer' },
  { value: 'structured', label: 'Structured' },
];

export function PracticeQuestionsDrawer({ onSubmit, existing }: Props) {
  // We don't store the original questionTypes / cognitive level / difficulty
  // on the material, so those fall back to sensible defaults on regenerate.
  const initialCount = existing?.questionIds?.length || 10;

  const [title, setTitle] = useState(existing?.title ?? 'Practice Questions');
  const [teacherNotes, setTeacherNotes] = useState(existing?.teacherNotes ?? '');
  const [prompt, setPrompt] = useState(existing?.teacherNotes ?? '');
  const [count, setCount] = useState(initialCount);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['mcq']);
  const [cognitiveLevel, setCognitiveLevel] = useState<CognitiveLevel>('application');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setTeacherNotes(existing.teacherNotes ?? '');
    setPrompt(existing.teacherNotes ?? '');
    setCount(existing.questionIds?.length || 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?._id]);

  const toggleType = (type: QuestionType) => {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const countValid = Number.isFinite(count) && count >= 1 && count <= 50;
  const canSubmit = !busy && countValid && questionTypes.length > 0;

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({
        kind: 'practice_questions',
        title: title || 'Practice Questions',
        teacherNotes: teacherNotes || undefined,
        questionPayload: {
          count,
          questionTypes,
          cognitiveLevel,
          difficulty,
          instructions: prompt || undefined,
        },
      });
    } finally {
      setBusy(false);
    }
  };

  const actionLabel = existing ? 'Regenerate' : 'Generate';
  const busyLabel = existing ? 'Regenerating...' : 'Generating...';

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="pq-title">Title</Label>
        <Input
          id="pq-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <Label htmlFor="pq-notes">Teacher notes (optional)</Label>
        <Textarea
          id="pq-notes"
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <Label htmlFor="pq-prompt">Generation prompt</Label>
        <Textarea
          id="pq-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full"
          rows={3}
          placeholder="e.g. Cover quadratic factorisation including difference-of-squares"
        />
      </div>
      <div>
        <Label htmlFor="pq-count">Number of questions (1-50)</Label>
        <Input
          id="pq-count"
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full sm:w-32"
        />
        {!countValid && (
          <p className="text-xs text-destructive mt-1">Count must be between 1 and 50.</p>
        )}
      </div>
      <div>
        <Label>Question types</Label>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 mt-1">
          {QUESTION_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={questionTypes.includes(opt.value)}
                onCheckedChange={() => toggleType(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        {questionTypes.length === 0 && (
          <p className="text-xs text-destructive mt-1">Select at least one type.</p>
        )}
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <div>
          <Label htmlFor="pq-cog">Cognitive level</Label>
          <select
            id="pq-cog"
            value={cognitiveLevel}
            onChange={(e) => setCognitiveLevel(e.target.value as CognitiveLevel)}
            className="w-full border rounded px-2 py-1 bg-background"
          >
            <option value="recall">Recall</option>
            <option value="application">Application</option>
            <option value="analysis">Analysis</option>
          </select>
        </div>
        <div>
          <Label htmlFor="pq-diff">Difficulty</Label>
          <select
            id="pq-diff"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="w-full border rounded px-2 py-1 bg-background"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button disabled={!canSubmit} onClick={submit}>
          {busy ? busyLabel : actionLabel}
        </Button>
      </div>
    </div>
  );
}
