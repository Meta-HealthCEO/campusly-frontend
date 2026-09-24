'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EditableStep } from '@/lib/item-editing';

interface Props {
  steps: EditableStep[];
  onChange: (steps: EditableStep[]) => void;
}

const MAX_STEPS = 12;

/** A worked example's steps, revealed to learners one at a time. */
export function StepsEditor({ steps, onChange }: Props) {
  const set = (i: number, patch: Partial<EditableStep>): void => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`step-title-${i}`} className="font-mono text-xs text-muted-foreground">Step {i + 1}</Label>
            <Button size="icon-sm" variant="ghost" onClick={() => onChange(steps.filter((_, j) => j !== i))} aria-label={`Remove step ${i + 1}`} disabled={steps.length === 1}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input id={`step-title-${i}`} value={s.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Step title, e.g. Start at 47" />
          <Textarea value={s.content} onChange={(e) => set(i, { content: e.target.value })} placeholder="What the learner does in this step" className="min-h-20" aria-label={`Step ${i + 1} content`} />
        </li>
      ))}
      {steps.length < MAX_STEPS ? (
        <li>
          <Button variant="outline" size="sm" onClick={() => onChange([...steps, { title: '', content: '' }])} className="min-h-11 gap-1.5 sm:min-h-8">
            <Plus className="h-4 w-4" aria-hidden /> Add a step
          </Button>
        </li>
      ) : null}
    </ol>
  );
}
