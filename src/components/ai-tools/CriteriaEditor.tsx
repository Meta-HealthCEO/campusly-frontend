'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CriteriaScore } from './types';

export interface CriteriaEdit {
  criterion: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

interface CriteriaEditorProps {
  criteria: CriteriaEdit[];
  aiScores: CriteriaScore[];
  onChange: (updated: CriteriaEdit[]) => void;
}

export function CriteriaEditor({ criteria, aiScores, onChange }: CriteriaEditorProps) {
  const handleScoreChange = (index: number, value: number) => {
    const clamped = Math.max(0, Math.min(criteria[index].maxScore, value));
    const updated = criteria.map((c, i) =>
      i === index ? { ...c, score: clamped } : c,
    );
    onChange(updated);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {criteria.map((edit, i) => {
        const ai = aiScores.find((s) => s.criterion === edit.criterion);
        return (
          <div key={edit.criterion} className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium truncate">{edit.criterion}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>AI: {ai?.score ?? edit.score}</span>
              <span>/</span>
              <span>{edit.maxScore}</span>
              {ai?.feedback && (
                <span className="truncate hidden sm:inline">{ai.feedback}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">Override</Label>
              <Input
                type="number"
                min={0}
                max={edit.maxScore}
                step={0.5}
                value={edit.score}
                onChange={(e) => handleScoreChange(i, Number(e.target.value))}
                className="h-7 w-20 text-sm"
              />
              <span className="text-xs text-muted-foreground">/ {edit.maxScore}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
