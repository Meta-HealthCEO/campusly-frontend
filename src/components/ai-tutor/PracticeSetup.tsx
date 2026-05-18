'use client';

import { useState } from 'react';
import { ClipboardCheck, Flame, Loader2, Settings2, Sparkles, Target, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GeneratePracticePayload, Subject } from '@/types';

interface PracticeSetupProps {
  onGenerate: (payload: GeneratePracticePayload) => void;
  generating: boolean;
  subjects: Subject[];
  grade: number;
  initialSubjectId?: string;
  initialTopic?: string;
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type QuestionType = 'mcq' | 'short_answer' | 'true_false';

const DIFFICULTIES: Array<{
  value: Difficulty;
  label: string;
  description: string;
  icon: typeof Target;
}> = [
  { value: 'easy', label: 'Warm-up', description: 'Build confidence first.', icon: Timer },
  { value: 'medium', label: 'Standard', description: 'Class-level practice.', icon: Target },
  { value: 'hard', label: 'Stretch', description: 'Push exam thinking.', icon: Flame },
  { value: 'mixed', label: 'Mixed', description: 'Adaptive blend.', icon: ClipboardCheck },
];

const Q_TYPES: { value: QuestionType; label: string; helper: string }[] = [
  { value: 'mcq', label: 'Multiple choice', helper: 'Fast concept checks' },
  { value: 'short_answer', label: 'Short answer', helper: 'Written reasoning' },
  { value: 'true_false', label: 'True / false', helper: 'Quick recall' },
];

const PRESETS: Array<{
  label: string;
  questions: number;
  difficulty: Difficulty;
  types: QuestionType[];
}> = [
  { label: '5 min warm-up', questions: 5, difficulty: 'easy', types: ['mcq', 'true_false'] },
  { label: 'Exam drill', questions: 10, difficulty: 'mixed', types: ['mcq', 'short_answer'] },
  { label: 'Deep practice', questions: 12, difficulty: 'hard', types: ['short_answer', 'mcq'] },
];

export function PracticeSetup({
  onGenerate,
  generating,
  subjects,
  grade,
  initialSubjectId,
  initialTopic,
}: PracticeSetupProps) {
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? '');
  const [topic, setTopic] = useState(initialTopic ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['mcq', 'short_answer']);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const canStart = grade >= 1 && Boolean(subjectId && topic.trim());

  const toggleType = (type: QuestionType, checked: boolean) => {
    setQuestionTypes((prev) => {
      const next = checked ? [...prev, type] : prev.filter((value) => value !== type);
      return next.length > 0 ? next : prev;
    });
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setQuestionCount(preset.questions);
    setDifficulty(preset.difficulty);
    setQuestionTypes(preset.types);
  };

  const handleGenerate = () => {
    if (!subjectId || !topic.trim() || grade < 1) return;
    onGenerate({
      subjectId,
      subjectName: selectedSubject?.name ?? '',
      grade,
      topic: topic.trim(),
      questionCount: Math.max(3, Math.min(20, questionCount)),
      difficulty,
      questionTypes: questionTypes.length > 0 ? questionTypes : ['mcq'],
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid gap-5 border-b p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <Badge className="mb-3 bg-primary text-primary-foreground">
            <Sparkles className="h-3 w-3" />
            Aura Practice
          </Badge>
          <h2 className="text-2xl font-bold tracking-normal">Start a Aura practice drill</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pick what you are working on. Aura will generate a short drill, mark it, and explain every miss.
          </p>
        </div>
        <div className="rounded-lg border bg-background px-4 py-3 text-sm">
          <p className="font-semibold">Grade {grade || '-'}</p>
          <p className="text-xs text-muted-foreground">
            {grade >= 1 ? 'Minimum 3 questions' : 'Join a class before practising'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 p-5">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select value={subjectId} onValueChange={(v: unknown) => setSubjectId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Topic <span className="text-destructive">*</span></Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Quadratic equations"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-4">
            <Button
              onClick={handleGenerate}
              disabled={generating || !canStart}
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Start 5-question drill
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              <Settings2 className="h-4 w-4" />
              {showAdvanced ? 'Hide options' : 'Customise'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Standard difficulty, mixed question types. You can customise when you need exam-style practice.
            </span>
          </div>

          {showAdvanced && (
            <div className="space-y-5 rounded-lg border bg-background p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div>
                  <h3 className="font-semibold">Customise the drill</h3>
                  <p className="text-sm text-muted-foreground">
                    Use this when you want a harder paper-style drill or a very specific question mix.
                  </p>
                </div>
                <div className="grid gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-lg border bg-card px-3 py-2 text-left text-sm transition hover:border-primary/50 hover:bg-accent"
                    >
                      <span className="font-medium">{preset.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {preset.questions} questions, {preset.difficulty}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <div className="grid gap-2 md:grid-cols-4">
                  {DIFFICULTIES.map((item) => {
                    const Icon = item.icon;
                    const active = difficulty === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setDifficulty(item.value)}
                        className={cn(
                          'rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-accent',
                          active ? 'border-primary bg-primary/5' : 'border-border',
                        )}
                      >
                        <Icon
                          className={cn(
                            'mb-2 h-4 w-4',
                            active ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="space-y-1.5">
                  <Label>Number of questions</Label>
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value) || 5)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Question types</Label>
                  <div className="grid gap-2 md:grid-cols-3">
                    {Q_TYPES.map((questionType) => (
                      <label
                        key={questionType.value}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition hover:bg-accent"
                      >
                        <Checkbox
                          checked={questionTypes.includes(questionType.value)}
                          onCheckedChange={(checked: boolean) => toggleType(questionType.value, checked)}
                        />
                        <span>
                          <span className="block font-medium">{questionType.label}</span>
                          <span className="block text-xs text-muted-foreground">{questionType.helper}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !canStart}
                className="w-full sm:w-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate custom drill
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
