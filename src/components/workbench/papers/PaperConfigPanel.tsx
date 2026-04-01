'use client';

import { Loader2, Sparkles, Send, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Difficulty, CognitiveLevel } from '@/types';
import type { PaperBuilderSection } from './PaperBuilderPanel';

export interface PaperConfig {
  subject: string;
  grade: string;
  term: string;
  duration: number;
  totalMarks: number;
}

interface PaperConfigPanelProps {
  config: PaperConfig;
  onConfigChange: (config: PaperConfig) => void;
  sections: PaperBuilderSection[];
  onGenerateMemo: () => void;
  onSubmitModeration: () => void;
  onSaveDraft: () => void;
  saving: boolean;
  generatingMemo: boolean;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const COGNITIVE_LEVELS: CognitiveLevel[] = [
  'knowledge',
  'comprehension',
  'application',
  'analysis',
  'synthesis',
  'evaluation',
];

function countByDifficulty(sections: PaperBuilderSection[]): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  sections.forEach((s) =>
    s.questions.forEach((q) => {
      counts[q.difficulty] = (counts[q.difficulty] ?? 0) + 1;
    }),
  );
  return counts;
}

function countByCognitive(sections: PaperBuilderSection[]): Record<CognitiveLevel, number> {
  const counts = {} as Record<CognitiveLevel, number>;
  COGNITIVE_LEVELS.forEach((l) => { counts[l] = 0; });
  sections.forEach((s) =>
    s.questions.forEach((q) => {
      counts[q.cognitiveLevel] = (counts[q.cognitiveLevel] ?? 0) + 1;
    }),
  );
  return counts;
}

export function PaperConfigPanel({
  config,
  onConfigChange,
  sections,
  onGenerateMemo,
  onSubmitModeration,
  onSaveDraft,
  saving,
  generatingMemo,
}: PaperConfigPanelProps) {
  const difficultyCounts = countByDifficulty(sections);
  const cognitiveCounts = countByCognitive(sections);
  const totalQ = sections.reduce((s, sec) => s + sec.questions.length, 0);

  function field(key: keyof PaperConfig) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = key === 'duration' ? Number(e.target.value) : e.target.value;
      onConfigChange({ ...config, [key]: val });
    };
  }

  const difficultyColors: Record<Difficulty, string> = {
    easy: 'bg-green-500',
    medium: 'bg-amber-500',
    hard: 'bg-destructive',
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Paper Config
      </p>

      {/* Config form */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="pb-subject" className="text-xs">Subject</Label>
          <Input
            id="pb-subject"
            value={config.subject}
            onChange={field('subject')}
            placeholder="e.g. Mathematics"
            className="h-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="pb-grade" className="text-xs">Grade</Label>
            <Input
              id="pb-grade"
              value={config.grade}
              onChange={field('grade')}
              placeholder="e.g. 10"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pb-term" className="text-xs">Term</Label>
            <Input
              id="pb-term"
              value={config.term}
              onChange={field('term')}
              placeholder="e.g. 2"
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pb-duration" className="text-xs">Duration (min)</Label>
          <Input
            id="pb-duration"
            type="number"
            min={0}
            value={config.duration}
            onChange={field('duration')}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">Total Marks</span>
          <span className="text-sm font-bold">{config.totalMarks}</span>
        </div>
      </div>

      {/* Difficulty distribution */}
      <div className="space-y-2">
        <p className="text-xs font-medium">Difficulty Split</p>
        {DIFFICULTIES.map((d) => {
          const count = difficultyCounts[d];
          const pct = totalQ > 0 ? Math.round((count / totalQ) * 100) : 0;
          return (
            <div key={d} className="space-y-0.5">
              <div className="flex justify-between text-xs capitalize">
                <span className="text-muted-foreground">{d}</span>
                <span>{count} ({pct}%)</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${difficultyColors[d]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Cognitive distribution */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium">Cognitive Levels</p>
        {COGNITIVE_LEVELS.map((l) => {
          const count = cognitiveCounts[l];
          if (count === 0) return null;
          return (
            <div key={l} className="flex justify-between text-xs capitalize">
              <span className="text-muted-foreground">{l}</span>
              <span className="font-medium">{count}</span>
            </div>
          );
        })}
        {totalQ === 0 && (
          <p className="text-xs text-muted-foreground italic">No questions yet</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-auto space-y-2">
        <Button
          className="w-full"
          variant="outline"
          onClick={onGenerateMemo}
          disabled={generatingMemo || totalQ === 0}
        >
          {generatingMemo ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate Memo
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={onSubmitModeration}
          disabled={totalQ === 0}
        >
          <Send className="h-4 w-4 mr-2" />
          Submit for Moderation
        </Button>
        <Button
          className="w-full"
          onClick={onSaveDraft}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Draft
        </Button>
      </div>
    </div>
  );
}
