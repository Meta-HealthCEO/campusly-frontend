'use client';

import { Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { DraftOption, DraftQuestion } from '@/lib/homework-ai-draft';

interface Props {
  question: DraftQuestion;
  index: number;
  checked: boolean;
  onToggle: () => void;
}

/** One drafted question as pupils will see it: text, any diagram, the options, and the answer to check. */
export function DraftQuestionItem({ question: d, index, checked, onToggle }: Props) {
  const checkboxId = `draft-question-${d.id}`;
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border p-3">
      <Checkbox id={checkboxId} checked={checked} onCheckedChange={onToggle} aria-label={`Keep question ${index + 1}`} className="mt-0.5" />
      {/* The whole row (not just the checkbox hitbox) toggles it — a native
          label delegates its click to the checkbox it names. */}
      <Label htmlFor={checkboxId} className="block min-w-0 flex-1 cursor-pointer space-y-1.5 text-sm font-normal">
        <p className="font-medium">{d.questionText}</p>
        {d.diagram?.svgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a rendered SVG from the question bank
          <img src={d.diagram.svgUrl} alt={`Diagram for question ${index + 1}`} className="max-h-48 max-w-full rounded border border-border bg-background" />
        ) : null}
        {d.diagram?.failed ? (
          <p className="text-xs text-attention">This question has a diagram that couldn&apos;t be drawn. Leave it out, or fix it in the Question Bank.</p>
        ) : null}
        {d.options.length > 0 ? (
          <ul className="space-y-0.5" aria-label="Options">
            {d.options.map((o: DraftOption) => (
              <li key={o.label} className={o.isCorrect ? 'flex items-center gap-1.5 font-medium text-success' : 'flex items-center gap-1.5'}>
                <span className="font-mono text-xs">{o.label}.</span> {o.text}
                {o.isCorrect ? <Check className="h-3.5 w-3.5" aria-label="Correct answer" /> : null}
              </li>
            ))}
          </ul>
        ) : d.answer ? (
          <p className="text-muted-foreground">Answer: <span className="text-foreground">{d.answer}</span></p>
        ) : null}
        <p className="font-mono text-xs text-muted-foreground tabular-nums">{d.marks} mark{d.marks === 1 ? '' : 's'}</p>
      </Label>
    </li>
  );
}
