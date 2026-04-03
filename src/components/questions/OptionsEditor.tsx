'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { QuestionOption } from '@/types/question-bank';

// ─── Props ──────────────────────────────────────────────────────────────────

interface OptionsEditorProps {
  fields: QuestionOption[];
  onAppend: () => void;
  onRemove: (i: number) => void;
  onLabelChange: (i: number, val: string) => void;
  onTextChange: (i: number, val: string) => void;
  onCorrectChange: (i: number, val: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OptionsEditor({
  fields,
  onAppend,
  onRemove,
  onLabelChange,
  onTextChange,
  onCorrectChange,
}: OptionsEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Options</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAppend}>
          <Plus className="size-3 mr-1" /> Add
        </Button>
      </div>
      {fields.map((field: QuestionOption, idx: number) => (
        <div key={field.label || `opt-${idx}`} className="flex items-center gap-2">
          <Input
            className="w-12 shrink-0"
            placeholder="A"
            value={field.label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onLabelChange(idx, e.target.value)
            }
          />
          <Input
            className="flex-1"
            placeholder="Option text"
            value={field.text}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onTextChange(idx, e.target.value)
            }
          />
          <div className="flex items-center gap-1">
            <Checkbox
              checked={field.isCorrect}
              onCheckedChange={(v: boolean) => onCorrectChange(idx, v)}
            />
            <span className="text-xs text-muted-foreground">Correct</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(idx)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
