'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { PaperImportJobOptions } from '@/types';

interface Props {
  value: PaperImportJobOptions;
  onChange: (next: PaperImportJobOptions) => void;
}

const TOGGLES: Array<{
  key: keyof Omit<PaperImportJobOptions, 'instructions'>;
  label: string;
  description: string;
}> = [
  {
    key: 'generateAnswers',
    label: 'Generate missing answers',
    description: 'For questions where the answer is not on the page, AI infers it.',
  },
  {
    key: 'addHints',
    label: 'Add hints',
    description: 'One short hint per question to help learners.',
  },
  {
    key: 'addWorkedExample',
    label: 'Add worked example for hardest question',
    description: 'A step-by-step solution appended to the resource.',
  },
  {
    key: 'addExplanations',
    label: 'Add explanation per question',
    description: 'A 1-3 sentence explanation alongside each answer.',
  },
];

export function OptionsForm({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <Label htmlFor={t.key} className="text-sm font-medium">{t.label}</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
            </div>
            <Switch
              id={t.key}
              checked={value[t.key]}
              onCheckedChange={(checked: boolean) => onChange({ ...value, [t.key]: checked })}
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="instructions">
          Special instructions{' '}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="instructions"
          value={value.instructions ?? ''}
          onChange={(e) => onChange({ ...value, instructions: e.target.value })}
          placeholder="e.g. simplify the language; use South African examples"
          className="min-h-20"
        />
      </div>
    </div>
  );
}
