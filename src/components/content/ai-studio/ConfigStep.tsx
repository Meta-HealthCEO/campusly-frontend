'use client';

import { BookOpen, FileText, Gamepad2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DIFFICULTY_LEVELS_SIMPLE } from '@/lib/design-system';
import type { ResourceType } from '@/types';
import type { Grade, Subject } from '@/types';

interface ConfigStepProps {
  resourceType: ResourceType;
  onResourceTypeChange: (t: ResourceType) => void;
  subjectId: string;
  onSubjectChange: (v: string) => void;
  gradeId: string;
  onGradeChange: (v: string) => void;
  term: number;
  onTermChange: (v: number) => void;
  difficulty: number;
  onDifficultyChange: (v: number) => void;
  instructions: string;
  onInstructionsChange: (v: string) => void;
  subjects: Subject[];
  grades: Grade[];
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
  onSubjectChange,
  gradeId,
  onGradeChange,
  term,
  onTermChange,
  difficulty,
  onDifficultyChange,
  instructions,
  onInstructionsChange,
  subjects,
  grades,
  onNext,
  onBack,
}: ConfigStepProps) {
  // Resource type is always selected (default: lesson). Subject/grade/term
  // are auto-detected from the curriculum tree — don't block if missing.
  const canContinue = true;

  return (
    <div className="space-y-6">
      {/* Resource Type Selector */}
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

      {/* Auto-detected from curriculum tree — show as read-only info */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Detected from topic:</span>
          {subjectId && (
            <Badge variant="outline">{subjects.find((s: Subject) => s.id === subjectId)?.name ?? 'Subject'}</Badge>
          )}
          {gradeId && (
            <Badge variant="outline">{grades.find((g: Grade) => g.id === gradeId)?.name ?? 'Grade'}</Badge>
          )}
          {term > 0 && (
            <Badge variant="outline">Term {term}</Badge>
          )}
          {!subjectId && !gradeId && !term && (
            <span className="text-muted-foreground italic">Could not detect — will use general settings</span>
          )}
        </CardContent>
      </Card>

      {/* Difficulty */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Difficulty Level</Label>
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

      {/* Instructions */}
      <div className="space-y-2">
        <Label>Special Instructions (optional)</Label>
        <Textarea
          placeholder="e.g., Include real-world SA examples, focus on exam-style questions, use simple language..."
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          className="min-h-20"
        />
      </div>

      {/* Actions */}
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
