'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { QuestionType, CapsLevel, BloomsLevel, QuestionOption } from '@/types/question-bank';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIFilledFields {
  stem: string;
  options: QuestionOption[];
  answer: string;
  markingRubric: string;
  marks: number;
}

interface AIGenerateButtonProps {
  curriculumNodeId: string | undefined;
  subjectId: string;
  gradeId: string;
  type: QuestionType;
  capsLevel: CapsLevel;
  bloomsLevel: BloomsLevel;
  difficulty: number;
  onFilled: (fields: AIFilledFields) => void;
  onGenerate: (payload: {
    curriculumNodeId: string;
    subjectId: string;
    gradeId: string;
    type: QuestionType;
    count: number;
    difficulty: number;
    cognitiveLevel: { caps: CapsLevel; blooms: BloomsLevel };
  }) => Promise<unknown[]>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AIGenerateButton({
  curriculumNodeId,
  subjectId,
  gradeId,
  type,
  capsLevel,
  bloomsLevel,
  difficulty,
  onFilled,
  onGenerate,
}: AIGenerateButtonProps) {
  const [generating, setGenerating] = useState(false);

  const missingFields: string[] = [];
  if (!curriculumNodeId) missingFields.push('curriculum node');
  if (!subjectId) missingFields.push('subject');
  if (!gradeId) missingFields.push('grade');

  const canGenerate = missingFields.length === 0;

  const handleGenerate = async () => {
    if (!canGenerate || !curriculumNodeId) return;
    setGenerating(true);
    try {
      const results = await onGenerate({
        curriculumNodeId,
        subjectId,
        gradeId,
        type,
        count: 1,
        difficulty,
        cognitiveLevel: { caps: capsLevel, blooms: bloomsLevel },
      });
      const first = Array.isArray(results) ? results[0] : null;
      if (!first || typeof first !== 'object') {
        toast.error('AI did not return a valid question');
        return;
      }
      const q = first as Record<string, unknown>;
      onFilled({
        stem: typeof q.stem === 'string' ? q.stem : '',
        options: Array.isArray(q.options) ? (q.options as QuestionOption[]) : [],
        answer: typeof q.answer === 'string' ? q.answer : '',
        markingRubric: typeof q.markingRubric === 'string' ? q.markingRubric : '',
        marks: typeof q.marks === 'number' ? q.marks : 1,
      });
      toast.success('Question generated — review and save');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'AI generation failed'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={!canGenerate || generating}
      title={
        !canGenerate
          ? `Select ${missingFields.join(', ')} first`
          : 'Generate question with AI'
      }
      className="gap-1.5"
    >
      {generating ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Sparkles className="size-3.5" />
      )}
      {generating ? 'Generating...' : 'Generate with AI'}
    </Button>
  );
}
