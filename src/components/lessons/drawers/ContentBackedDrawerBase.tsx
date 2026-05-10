'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type {
  ActivityMaterial,
  LessonMaterialKind,
  NotesMaterial,
  WorkedExampleMaterial,
  WorksheetMaterial,
} from '@/types/lesson';

type ContentResourceType = 'worksheet' | 'activity' | 'study_notes' | 'worked_example';
type Difficulty = 'easy' | 'medium' | 'hard';
type Term = 1 | 2 | 3 | 4;

export type ContentBackedExisting =
  | WorksheetMaterial
  | ActivityMaterial
  | NotesMaterial
  | WorkedExampleMaterial;

// Backend GenerateContentInput requires `difficulty` as a Number 1-5.
const DIFFICULTY_NUMERIC: Record<Difficulty, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
};

// Backend GenerateContentInput requires `blockTypes` (min 1) from blockTypeEnum.
// Default to a sensible mix — text exposition with at least 2 interactive blocks
// (the system prompt mandates this anyway).
const DEFAULT_BLOCK_TYPES: readonly string[] = ['text', 'quiz', 'fill_blank'];

interface Props {
  kind: LessonMaterialKind;
  contentType: ContentResourceType;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: ContentBackedExisting;
}

export function ContentBackedDrawerBase({ kind, contentType, onSubmit, existing }: Props) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [teacherNotes, setNotes] = useState(existing?.teacherNotes ?? '');
  const [prompt, setPrompt] = useState(existing?.teacherNotes ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [term, setTerm] = useState<Term>(1);
  const [busy, setBusy] = useState(false);

  // Re-seed when the drawer reopens with a different material.
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setNotes(existing.teacherNotes ?? '');
    setPrompt(existing.teacherNotes ?? '');
    // Intentionally only depends on existing._id — reseeding mid-edit on
    // every keystroke would clobber the teacher's in-progress changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?._id]);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({
        kind,
        title: title || `New ${kind}`,
        teacherNotes: teacherNotes || undefined,
        // Shape must match backend GenerateContentInput
        // (curriculumNodeId, subjectId, gradeId are injected by the lesson service
        // from the parent lesson context).
        contentPayload: {
          type: contentType,
          term,
          blockTypes: [...DEFAULT_BLOCK_TYPES],
          difficulty: DIFFICULTY_NUMERIC[difficulty],
          instructions: prompt,
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
        <Label htmlFor="cd-title">Title</Label>
        <Input
          id="cd-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <Label htmlFor="cd-notes">Teacher notes (optional)</Label>
        <Textarea
          id="cd-notes"
          value={teacherNotes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <Label htmlFor="cd-prompt">Generation prompt</Label>
        <Textarea
          id="cd-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Create 5 questions on factorising trinomials"
          className="w-full"
          rows={4}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="cd-term">Term</Label>
          <select
            id="cd-term"
            value={term}
            onChange={(e) => setTerm(Number(e.target.value) as Term)}
            className="w-full border rounded px-2 py-1 bg-background"
          >
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
            <option value={4}>Term 4</option>
          </select>
        </div>
        <div>
          <Label htmlFor="cd-diff">Difficulty</Label>
          <select
            id="cd-diff"
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
        <Button disabled={busy || !prompt.trim()} onClick={submit}>
          {busy ? busyLabel : actionLabel}
        </Button>
      </div>
    </div>
  );
}
