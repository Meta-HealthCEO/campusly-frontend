'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import type { HomeworkWizardType } from '@/stores/useTeacherHomeworkWizardStore';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { ClipboardList, BookOpen, Target } from 'lucide-react';

const TYPE_OPTIONS: Array<{
  value: HomeworkWizardType;
  label: string;
  description: string;
  icon: typeof ClipboardList;
}> = [
  {
    value: 'quiz',
    label: 'Quiz',
    description: 'Pick a quiz from the Learning module',
    icon: ClipboardList,
  },
  {
    value: 'reading',
    label: 'Reading',
    description: 'Pick a content resource; AI generates comprehension questions',
    icon: BookOpen,
  },
  {
    value: 'exercise',
    label: 'Exercise',
    description: 'Pick questions from the Question Bank',
    icon: Target,
  },
];

export function HomeworkWizardStep1() {
  const state = useTeacherHomeworkWizardStore();
  const { entries, classes } = useTeacherClasses();

  const subjects = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const e of entries) {
      if (e.subject && !map.has(e.subject.id)) {
        map.set(e.subject.id, { id: e.subject.id, name: e.subject.name });
      }
    }
    return Array.from(map.values());
  }, [entries]);

  const handleClassChange = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    state.set({ classId, gradeId: cls?.gradeId ?? '' });
  };

  const canAdvance =
    !!state.type &&
    state.title.trim().length > 0 &&
    !!state.subjectId &&
    !!state.classId &&
    !!state.dueDate &&
    state.totalMarks > 0 &&
    (state.latePolicy !== 'penalty' ||
      (state.latePenaltyPercent > 0 && state.latePenaltyPercent <= 100));

  return (
    <div className="space-y-6">
      {/* Type picker */}
      <div className="space-y-3">
        <Label>
          Type <span className="text-destructive">*</span>
        </Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = state.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => state.set({ type: opt.value })}
                className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary ${
                  selected ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <Icon className="h-5 w-5 text-primary" />
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Metadata fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hw-title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-title"
            value={state.title}
            onChange={(e) => state.set({ title: e.target.value })}
            placeholder="Chapter 5 Reading"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hw-dueDate">
            Due date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-dueDate"
            type="datetime-local"
            value={state.dueDate}
            onChange={(e) => state.set({ dueDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hw-subject">
            Subject <span className="text-destructive">*</span>
          </Label>
          <Select
            value={state.subjectId || undefined}
            onValueChange={(v: unknown) => {
              if (typeof v === 'string') state.set({ subjectId: v });
            }}
          >
            <SelectTrigger id="hw-subject" className="w-full">
              <SelectValue placeholder="Choose subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hw-class">
            Class <span className="text-destructive">*</span>
          </Label>
          <Select
            value={state.classId || undefined}
            onValueChange={(v: unknown) => {
              if (typeof v === 'string') handleClassChange(v);
            }}
          >
            <SelectTrigger id="hw-class" className="w-full">
              <SelectValue placeholder="Choose class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hw-totalMarks">
            Total marks <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-totalMarks"
            type="number"
            min={1}
            max={1000}
            value={state.totalMarks || ''}
            onChange={(e) => state.set({ totalMarks: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Late policy */}
      <div className="space-y-3 rounded-lg border p-4">
        <Label>Late submission policy</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['block', 'penalty', 'accept'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => state.set({ latePolicy: p })}
              className={`rounded-md border p-3 text-sm text-left transition-colors hover:border-primary ${
                state.latePolicy === p ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="font-medium capitalize">{p}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {p === 'block' && 'Reject late submissions'}
                {p === 'penalty' && 'Accept with mark penalty'}
                {p === 'accept' && 'Accept, no penalty'}
              </div>
            </button>
          ))}
        </div>

        {state.latePolicy === 'penalty' && (
          <div className="space-y-2">
            <Label htmlFor="hw-penalty">Penalty %</Label>
            <Input
              id="hw-penalty"
              type="number"
              min={0}
              max={100}
              value={state.latePenaltyPercent}
              onChange={(e) => state.set({ latePenaltyPercent: Number(e.target.value) })}
              className="w-full sm:w-24"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => state.set({ step: 2 })} disabled={!canAdvance}>
          Next
        </Button>
      </div>
    </div>
  );
}
