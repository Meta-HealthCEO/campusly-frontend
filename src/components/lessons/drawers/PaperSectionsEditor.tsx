'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export type SectionQuestionType =
  | 'mcq'
  | 'true_false'
  | 'short_answer'
  | 'structured';

export interface SectionInput {
  title: string;
  questionCount: number;
  questionType: SectionQuestionType;
}

const QUESTION_TYPE_OPTIONS: { value: SectionQuestionType; label: string }[] = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'true_false', label: 'True / false' },
  { value: 'short_answer', label: 'Short answer' },
  { value: 'structured', label: 'Structured' },
];

interface Props {
  sections: SectionInput[];
  totalQuestions: number;
  onUpdate: (idx: number, patch: Partial<SectionInput>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}

export function PaperSectionsEditor({
  sections,
  totalQuestions,
  onUpdate,
  onAdd,
  onRemove,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          Sections <span className="text-destructive">*</span>
        </Label>
        <span className="text-xs text-muted-foreground">
          {totalQuestions} questions total
        </span>
      </div>
      <div className="space-y-2">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_120px_180px_auto] items-end rounded-md border p-3"
          >
            <div>
              <Label htmlFor={`sec-title-${idx}`} className="text-xs">
                Title
              </Label>
              <Input
                id={`sec-title-${idx}`}
                className="w-full"
                value={section.title}
                onChange={(e) => onUpdate(idx, { title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`sec-count-${idx}`} className="text-xs">
                Questions
              </Label>
              <Input
                id={`sec-count-${idx}`}
                type="number"
                min={1}
                max={50}
                className="w-full"
                value={section.questionCount || ''}
                onChange={(e) =>
                  onUpdate(idx, { questionCount: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor={`sec-type-${idx}`} className="text-xs">
                Type
              </Label>
              <Select
                value={section.questionType}
                onValueChange={(v: unknown) =>
                  onUpdate(idx, { questionType: v as SectionQuestionType })
                }
              >
                <SelectTrigger id={`sec-type-${idx}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(idx)}
              disabled={sections.length <= 1}
              className="text-destructive"
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        Add section
      </Button>
    </div>
  );
}
