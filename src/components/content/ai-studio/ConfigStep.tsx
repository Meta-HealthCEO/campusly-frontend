'use client';

import { BookOpen, FileText, Gamepad2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
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

const DIFFICULTY_LEVELS = [
  { value: 1, label: 'Foundation', color: 'bg-emerald-500' },
  { value: 3, label: 'Standard', color: 'bg-amber-500' },
  { value: 5, label: 'Advanced', color: 'bg-primary' },
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
  const canContinue = subjectId && gradeId && term > 0;

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

      {/* Subject, Grade, Term */}
      <Card>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Subject <span className="text-destructive">*</span></Label>
            <Select value={subjectId} onValueChange={(v: unknown) => onSubjectChange(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s: Subject) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grade <span className="text-destructive">*</span></Label>
            <Select value={gradeId} onValueChange={(v: unknown) => onGradeChange(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g: Grade) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term <span className="text-destructive">*</span></Label>
            <Select
              value={term > 0 ? String(term) : ''}
              onValueChange={(v: unknown) => onTermChange(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
                <SelectItem value="4">Term 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Difficulty */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Difficulty Level</Label>
        <div className="flex gap-3">
          {DIFFICULTY_LEVELS.map((d) => (
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
                <span className={cn('h-2.5 w-2.5 rounded-full', d.color)} />
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
