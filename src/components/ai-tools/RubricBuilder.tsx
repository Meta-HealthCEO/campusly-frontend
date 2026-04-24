'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import type { RubricCriterion } from './types';
import { RubricTemplatePicker } from './RubricTemplatePicker';

interface RubricBuilderProps {
  rubric: RubricCriterion[];
  onChange: (rubric: RubricCriterion[]) => void;
}

export function RubricBuilder({ rubric, onChange }: RubricBuilderProps) {
  const addCriterion = () => {
    onChange([...rubric, { criterion: '', maxScore: 10, description: '' }]);
  };

  const removeCriterion = (index: number) => {
    onChange(rubric.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, field: keyof RubricCriterion, value: string | number) => {
    onChange(
      rubric.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Rubric Criteria
        </Label>
        <RubricTemplatePicker currentCriteria={rubric} onLoad={onChange} />
      </div>
      {rubric.map((criterion, idx) => (
        <div key={idx} className="flex items-end gap-3 rounded-lg border p-3">
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Criterion</Label>
              <Input
                placeholder="e.g. Content & Ideas"
                value={criterion.criterion}
                onChange={(e) => updateCriterion(idx, 'criterion', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Score</Label>
              <Input
                type="number"
                min={1}
                value={criterion.maxScore}
                onChange={(e) => updateCriterion(idx, 'maxScore', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="What this measures"
                value={criterion.description}
                onChange={(e) => updateCriterion(idx, 'description', e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeCriterion(idx)}
            disabled={rubric.length <= 1}
            className="shrink-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={addCriterion} className="w-full" size="sm">
        <Plus className="mr-2 h-4 w-4" /> Add Criterion
      </Button>
    </div>
  );
}
