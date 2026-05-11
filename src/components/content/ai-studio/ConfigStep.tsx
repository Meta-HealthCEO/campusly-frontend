'use client';

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileText,
  Gamepad2,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DIFFICULTY_LEVELS_SIMPLE } from '@/lib/design-system';
import type { ResourceType } from '@/types';

type ContextStatus = 'idle' | 'preparing' | 'ready' | 'error';

interface ConfigStepProps {
  resourceType: ResourceType;
  onResourceTypeChange: (t: ResourceType) => void;
  subjectId: string;
  gradeId: string;
  term: number;
  contextSubjectName: string;
  contextGradeName: string;
  contextTerm: number;
  contextStatus: ContextStatus;
  contextError: string | null;
  difficulty: number;
  onDifficultyChange: (v: number) => void;
  instructions: string;
  onInstructionsChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const RESOURCE_TYPES: { value: ResourceType; label: string; desc: string; icon: typeof BookOpen }[] = [
  { value: 'lesson', label: 'Lesson', desc: 'Full lesson with explanations & examples', icon: BookOpen },
  { value: 'worksheet', label: 'Worksheet', desc: 'Practice exercises & problems', icon: FileText },
  { value: 'activity', label: 'Activity', desc: 'Interactive tasks & group work', icon: Gamepad2 },
];

export function ConfigStep({
  resourceType,
  onResourceTypeChange,
  subjectId,
  gradeId,
  term,
  contextSubjectName,
  contextGradeName,
  contextTerm,
  contextStatus,
  contextError,
  difficulty,
  onDifficultyChange,
  instructions,
  onInstructionsChange,
  onNext,
  onBack,
}: ConfigStepProps) {
  const canContinue = contextStatus === 'ready' && Boolean(subjectId && gradeId && term >= 1 && term <= 4);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-semibold">What would you like to create?</Label>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {RESOURCE_TYPES.map((rt) => {
            const Icon = rt.icon;
            const isSelected = resourceType === rt.value;
            return (
              <button
                key={rt.value}
                type="button"
                onClick={() => onResourceTypeChange(rt.value)}
                className={cn(
                  'group relative flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-transparent bg-muted/40 hover:border-muted-foreground/20 hover:bg-muted/60',
                )}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="font-semibold text-sm">{rt.label}</span>
                <span className="text-xs text-muted-foreground">{rt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Generation context</p>
              <p className="text-xs text-muted-foreground">CAPS-aligned selection</p>
            </div>
            {contextStatus === 'preparing' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing
              </span>
            )}
            {contextStatus === 'ready' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Ready
              </span>
            )}
            {contextStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Needs attention
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="mt-1 text-sm font-medium">{contextSubjectName || 'Not detected'}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">Grade</p>
              <p className="mt-1 text-sm font-medium">{contextGradeName || 'Not detected'}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">Term</p>
              <p className="mt-1 text-sm font-medium">
                {contextTerm > 0 ? `Term ${contextTerm}` : 'Not detected'}
              </p>
            </div>
          </div>

          {contextStatus === 'preparing' && (
            <p className="text-sm text-muted-foreground">
              Creating any missing teacher workspace records needed for this CAPS selection.
            </p>
          )}

          {contextStatus === 'error' && (
            <p className="text-sm text-destructive">
              {contextError ?? 'Could not prepare this topic for generation.'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Label className="text-base font-semibold">Resource difficulty</Label>
        <div className="flex gap-3">
          {DIFFICULTY_LEVELS_SIMPLE.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => onDifficultyChange(d.value)}
              className={cn(
                'flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-all duration-200',
                difficulty === d.value
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent bg-muted/40 hover:bg-muted/60',
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', d.dot)} />
                {d.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Special Instructions (optional)</Label>
        <Textarea
          placeholder="e.g., Include real-world SA examples, focus on exam-style questions, use simple language..."
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          className="min-h-20"
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continue
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
