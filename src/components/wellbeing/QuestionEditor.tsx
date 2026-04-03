'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { SurveyQuestion, WellbeingQuestionType } from '@/types';

const QUESTION_TYPES: { value: WellbeingQuestionType; label: string }[] = [
  { value: 'scale', label: 'Scale (1-5)' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'text', label: 'Free Text' },
  { value: 'yes_no', label: 'Yes / No' },
];

interface QuestionEditorProps {
  question: SurveyQuestion;
  onChange: (updated: SurveyQuestion) => void;
}

export function QuestionEditor({ question, onChange }: QuestionEditorProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs">Question Text</Label>
          <Input
            value={question.text}
            onChange={(e) => onChange({ ...question, text: e.target.value })}
            placeholder="Enter question..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={question.type}
            onValueChange={(v: unknown) => onChange({ ...question, type: ((v as string) ?? 'scale') as WellbeingQuestionType })}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {question.type === 'scale' && (
        <div className="grid gap-3 grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Min</Label>
            <Input
              type="number"
              value={question.scaleMin ?? 1}
              onChange={(e) => onChange({ ...question, scaleMin: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max</Label>
            <Input
              type="number"
              value={question.scaleMax ?? 5}
              onChange={(e) => onChange({ ...question, scaleMax: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {question.type === 'multiple_choice' && (
        <div className="space-y-1">
          <Label className="text-xs">Options (comma-separated)</Label>
          <Input
            value={(question.options ?? []).join(', ')}
            onChange={(e) =>
              onChange({
                ...question,
                options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
              })
            }
            placeholder="Happy, Sad, Anxious, Stressed"
          />
        </div>
      )}
    </div>
  );
}
