'use client';

// Collapsible "Advanced — Question structure" panel for the paper-generation
// wizard. Lets teachers weight question types (MCQ / short answer / structured
// / essay / calculation) as percentages of total marks. Default-closed so the
// step-2 form stays compact for teachers who just want a sensible mix.

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, RotateCcw, Save } from 'lucide-react';
import {
  PAPER_QUESTION_TYPES,
  type PaperQuestionType,
  type QuestionTypeWeight,
} from '@/types/papers';

const TYPE_LABELS: Record<PaperQuestionType, string> = {
  mcq: 'Multiple choice',
  short_answer: 'Short answer',
  structured: 'Structured',
  essay: 'Essay',
  calculation: 'Calculation',
};

const TYPE_HINTS: Record<PaperQuestionType, string> = {
  mcq: '1–2 marks each',
  short_answer: '2–3 marks each',
  structured: '3–5 marks each',
  essay: '8–15 marks each',
  calculation: '3–6 marks each',
};

export const DEFAULT_QUESTION_MIX: QuestionTypeWeight[] = PAPER_QUESTION_TYPES.map((type) => ({
  type,
  weight: type === 'structured' ? 40 : type === 'short_answer' ? 30 : type === 'mcq' ? 20 : type === 'essay' ? 10 : 0,
}));

interface QuestionMixEditorProps {
  value: QuestionTypeWeight[];
  onChange: (next: QuestionTypeWeight[]) => void;
  /** When provided, exposes a "Save as subject default" action. */
  onSaveAsDefault?: () => void;
  saving?: boolean;
  /** Subject-level defaults shown for "reset" affordance. */
  subjectDefault?: QuestionTypeWeight[] | null;
}

function totalWeight(weights: QuestionTypeWeight[]): number {
  return weights.reduce((sum, w) => sum + (Number.isFinite(w.weight) ? w.weight : 0), 0);
}

function weightFor(weights: QuestionTypeWeight[], type: PaperQuestionType): number {
  return weights.find((w) => w.type === type)?.weight ?? 0;
}

function setWeightFor(
  weights: QuestionTypeWeight[],
  type: PaperQuestionType,
  weight: number,
): QuestionTypeWeight[] {
  const clean = Math.max(0, Math.min(100, Math.round(weight)));
  const existing = weights.find((w) => w.type === type);
  if (existing) {
    return weights.map((w) => (w.type === type ? { ...w, weight: clean } : w));
  }
  return [...weights, { type, weight: clean }];
}

export function QuestionMixEditor({
  value,
  onChange,
  onSaveAsDefault,
  saving,
  subjectDefault,
}: QuestionMixEditorProps) {
  const [open, setOpen] = useState(false);
  const total = useMemo(() => totalWeight(value), [value]);
  const totalOk = Math.abs(total - 100) <= 2;

  const handleChange = useCallback((type: PaperQuestionType, weight: number) => {
    onChange(setWeightFor(value, type, weight));
  }, [value, onChange]);

  const handleReset = useCallback(() => {
    onChange(subjectDefault && subjectDefault.length > 0 ? [...subjectDefault] : [...DEFAULT_QUESTION_MIX]);
  }, [onChange, subjectDefault]);

  return (
    <div className="col-span-full space-y-2 rounded-lg border bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Advanced — Question structure
        </span>
        <Badge variant={totalOk ? 'outline' : 'destructive'} className="text-[10px]">
          Total {total}%
        </Badge>
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          <p className="text-xs text-muted-foreground">
            Weight how each question type contributes to the paper. Targets are soft —
            the generator will get close but may adjust if the question bank runs out
            of a given type. Weights should sum to 100.
          </p>

          <div className="space-y-2.5">
            {PAPER_QUESTION_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`mix-${type}`} className="text-sm">
                    {TYPE_LABELS[type]}
                  </Label>
                  <p className="text-[10px] text-muted-foreground">{TYPE_HINTS[type]}</p>
                </div>
                <Input
                  id={`mix-${type}`}
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={weightFor(value, type)}
                  onChange={(e) => handleChange(type, Number(e.target.value) || 0)}
                  className="w-20 text-right"
                />
                <span className="w-6 text-xs text-muted-foreground">%</span>
              </div>
            ))}
          </div>

          {!totalOk && (
            <p className="text-xs text-destructive">
              Weights total {total}% — adjust to 100% before generating.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {subjectDefault && subjectDefault.length > 0 ? 'Reset to subject default' : 'Reset to suggested'}
            </Button>
            {onSaveAsDefault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSaveAsDefault}
                disabled={!totalOk || saving}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saving ? 'Saving…' : 'Save as subject default'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
