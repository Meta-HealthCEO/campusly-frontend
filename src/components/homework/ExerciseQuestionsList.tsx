'use client';

import { Check, FileQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import type { QuestionItem, QuestionType } from '@/types/question-bank';

interface Props {
  questions: QuestionItem[];
}

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  true_false: 'True / false',
  short_answer: 'Short answer',
  structured: 'Structured',
  essay: 'Essay',
  match: 'Match',
  fill_blank: 'Fill blank',
  calculation: 'Calculation',
  diagram_label: 'Diagram label',
  case_study: 'Case study',
};

function QuestionCard({ q, index }: { q: QuestionItem; index: number }) {
  const type = q.type as QuestionType;
  const typeLabel = TYPE_LABELS[type] ?? type;

  return (
    <div className="rounded-md border bg-card p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <span className="text-sm font-semibold shrink-0">Q{index + 1}.</span>
        <Badge variant="outline" className="text-xs shrink-0">{typeLabel}</Badge>
        <Badge variant="secondary" className="text-xs shrink-0">
          {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
        </Badge>
      </div>

      <p className="text-sm whitespace-pre-wrap">{q.stem}</p>

      {type === 'mcq' && q.options.length > 0 && (
        <ul className="space-y-1.5">
          {q.options.map((opt, i) => (
            <li
              key={i}
              className={
                'flex items-start gap-2 text-sm rounded px-2 py-1.5 ' +
                (opt.isCorrect ? 'bg-emerald-50 text-emerald-900' : 'bg-muted/40')
              }
            >
              <span className="font-medium shrink-0">{opt.label}.</span>
              <span className="flex-1">{opt.text}</span>
              {opt.isCorrect && (
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
            </li>
          ))}
        </ul>
      )}

      {type === 'true_false' && q.answer && (
        <div className="text-sm">
          <span className="text-muted-foreground">Answer: </span>
          <span className="font-medium capitalize text-emerald-700">{q.answer}</span>
        </div>
      )}

      {(type === 'short_answer' || type === 'structured' || type === 'essay'
        || type === 'fill_blank' || type === 'calculation' || type === 'case_study'
        || type === 'diagram_label' || type === 'match') && q.answer && (
        <div className="rounded-md bg-muted/40 border p-2 sm:p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Memo</p>
          <p className="whitespace-pre-wrap">{q.answer}</p>
        </div>
      )}

      {q.markingRubric && (
        <p className="text-xs italic text-muted-foreground whitespace-pre-wrap">
          Rubric: {q.markingRubric}
        </p>
      )}
    </div>
  );
}

export function ExerciseQuestionsList({ questions }: Props) {
  if (questions.length === 0) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="No questions in this homework"
        description="The exercise was created but no questions are attached yet."
      />
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <QuestionCard key={q.id || i} q={q} index={i} />
      ))}
    </div>
  );
}
