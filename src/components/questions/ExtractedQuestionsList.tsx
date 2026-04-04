'use client';

import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QUESTION_TYPE_LABELS, CAPS_LEVEL_LABELS } from '@/lib/design-system';
import type { ExtractedQuestionItem } from '@/types/question-bank';

interface ExtractedQuestionsListProps {
  questions: ExtractedQuestionItem[];
  selected: Set<number>;
  onToggle: (index: number) => void;
}

export function ExtractedQuestionsList({ questions, selected, onToggle }: ExtractedQuestionsListProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No questions were found in the image. Try uploading a clearer photo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q: ExtractedQuestionItem, i: number) => (
        <div
          key={i}
          className={`rounded-lg border p-3 cursor-pointer transition-colors ${
            selected.has(i) ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
          }`}
          onClick={() => onToggle(i)}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {selected.has(i) ? (
                <div className="size-5 rounded bg-primary flex items-center justify-center">
                  <Check className="size-3 text-primary-foreground" />
                </div>
              ) : (
                <div className="size-5 rounded border-2 border-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm line-clamp-3">{q.stem}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{QUESTION_TYPE_LABELS[q.type] ?? q.type}</Badge>
                <Badge variant="outline">[{q.marks}]</Badge>
                <Badge variant="outline">{CAPS_LEVEL_LABELS[q.capsLevel] ?? q.capsLevel}</Badge>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 p-1 hover:bg-muted rounded"
              onClick={(e) => { e.stopPropagation(); onToggle(i); }}
              title={selected.has(i) ? 'Deselect' : 'Select'}
            >
              <X className="size-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
