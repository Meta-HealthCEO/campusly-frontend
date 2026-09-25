'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { emptyQuestion, type EditableQuestion } from '@/lib/item-editing';

interface Props {
  questions: EditableQuestion[];
  onChange: (questions: EditableQuestion[]) => void;
}

const MAX_QUESTIONS = 8;
const MAX_OPTIONS = 5;
const LABELS = 'ABCDE';

/** A quick check's questions: each with its answer choices and the one right answer. */
export function QuestionsEditor({ questions, onChange }: Props) {
  const setQ = (i: number, next: EditableQuestion): void => onChange(questions.map((q, j) => (j === i ? next : q)));
  return (
    <ol className="space-y-4">
      {questions.map((q, i) => (
        <li key={i} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading text-xs text-muted-foreground">Question {i + 1}</span>
            <Button size="icon-sm" variant="ghost" onClick={() => onChange(questions.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`} disabled={questions.length === 1} className="min-h-11 min-w-11 sm:min-h-7 sm:min-w-7">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea value={q.stem} onChange={(e) => setQ(i, { ...q, stem: e.target.value })} placeholder="The question" className="min-h-16" aria-label={`Question ${i + 1}`} />
          <fieldset className="space-y-1.5">
            <legend className="text-xs text-muted-foreground">Answer choices: tick the right one</legend>
            {q.options.map((o, k) => (
              <div key={k} className="flex items-center gap-2">
                <label className="flex h-11 w-11 shrink-0 items-center justify-center sm:h-5 sm:w-5">
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={o.isCorrect}
                    onChange={() => setQ(i, { ...q, options: q.options.map((x, m) => ({ ...x, isCorrect: m === k })) })}
                    className="h-5 w-5 shrink-0 accent-[var(--success)]"
                    aria-label={`Choice ${LABELS[k]} is the right answer`}
                  />
                </label>
                <span className="w-4 shrink-0 font-heading text-xs">{LABELS[k]}.</span>
                <Input value={o.text} onChange={(e) => setQ(i, { ...q, options: q.options.map((x, m) => (m === k ? { ...x, text: e.target.value } : x)) })} aria-label={`Choice ${LABELS[k]}`} className="flex-1" />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setQ(i, { ...q, options: q.options.filter((_, m) => m !== k) })}
                  aria-label={`Remove choice ${LABELS[k]}`}
                  disabled={q.options.length <= 2}
                  className="min-h-11 min-w-11 sm:min-h-7 sm:min-w-7"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {q.options.length < MAX_OPTIONS ? (
              <Button variant="ghost" size="sm" onClick={() => setQ(i, { ...q, options: [...q.options, { text: '', isCorrect: false }] })} className="gap-1">
                <Plus className="h-3.5 w-3.5" aria-hidden /> Add a choice
              </Button>
            ) : null}
          </fieldset>
        </li>
      ))}
      {questions.length < MAX_QUESTIONS ? (
        <li>
          <Button variant="outline" size="sm" onClick={() => onChange([...questions, emptyQuestion()])} className="min-h-11 gap-1.5 sm:min-h-8">
            <Plus className="h-4 w-4" aria-hidden /> Add a question
          </Button>
        </li>
      ) : null}
    </ol>
  );
}
