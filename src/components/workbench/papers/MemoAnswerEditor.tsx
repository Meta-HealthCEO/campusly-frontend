'use client';

import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { MemoAnswer, MarkCriterion } from '@/types';

interface MemoAnswerEditorProps {
  answer: MemoAnswer;
  questionText: string;
  onChange: (updated: MemoAnswer) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export function MemoAnswerEditor({
  answer,
  questionText,
  onChange,
  onRegenerate,
  regenerating,
}: MemoAnswerEditorProps) {
  function handleExpectedAnswerChange(value: string) {
    onChange({ ...answer, expectedAnswer: value });
  }

  function handleCriterionChange(index: number, field: keyof MarkCriterion, value: string | number) {
    const updated = answer.markAllocation.map((c, i) =>
      i === index ? { ...c, [field]: value } : c,
    );
    onChange({ ...answer, markAllocation: updated });
  }

  function addCriterion() {
    onChange({
      ...answer,
      markAllocation: [...answer.markAllocation, { criterion: '', marks: 1 }],
    });
  }

  function removeCriterion(index: number) {
    onChange({
      ...answer,
      markAllocation: answer.markAllocation.filter((_, i) => i !== index),
    });
  }

  function handleListItemChange(
    field: 'commonMistakes' | 'acceptableAlternatives',
    index: number,
    value: string,
  ) {
    const updated = answer[field].map((item, i) => (i === index ? value : item));
    onChange({ ...answer, [field]: updated });
  }

  function addListItem(field: 'commonMistakes' | 'acceptableAlternatives') {
    onChange({ ...answer, [field]: [...answer[field], ''] });
  }

  function removeListItem(field: 'commonMistakes' | 'acceptableAlternatives', index: number) {
    onChange({ ...answer, [field]: answer[field].filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold">Q{answer.questionNumber}</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={regenerating}
          className="shrink-0"
        >
          {regenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">Regenerate</span>
        </Button>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <p className="text-sm text-muted-foreground">{questionText}</p>
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Expected Answer</Label>
        <Textarea
          value={answer.expectedAnswer}
          onChange={(e) => handleExpectedAnswerChange(e.target.value)}
          rows={3}
          className="text-sm resize-none"
          placeholder="Enter expected answer..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Mark Allocation</Label>
        <div className="space-y-2">
          {answer.markAllocation.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={c.criterion}
                onChange={(e) => handleCriterionChange(i, 'criterion', e.target.value)}
                placeholder="Criterion"
                className="flex-1 text-sm h-8"
              />
              <Input
                type="number"
                value={c.marks}
                onChange={(e) => handleCriterionChange(i, 'marks', Number(e.target.value))}
                className="w-16 text-sm h-8"
                min={0}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCriterion(i)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addCriterion} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Criterion
        </Button>
      </div>

      {(['commonMistakes', 'acceptableAlternatives'] as const).map((field) => (
        <div key={field} className="space-y-2">
          <Label className="text-xs font-medium capitalize">
            {field === 'commonMistakes' ? 'Common Mistakes' : 'Acceptable Alternatives'}
          </Label>
          <div className="space-y-1.5">
            {answer[field].map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={item}
                  onChange={(e) => handleListItemChange(field, i, e.target.value)}
                  placeholder={field === 'commonMistakes' ? 'Describe mistake...' : 'Alternative answer...'}
                  className="flex-1 text-sm h-8"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeListItem(field, i)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addListItem(field)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add {field === 'commonMistakes' ? 'Mistake' : 'Alternative'}
          </Button>
        </div>
      ))}
    </div>
  );
}
