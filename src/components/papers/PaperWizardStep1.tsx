'use client';

import { useMemo } from 'react';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useCurriculumTopics, type CurriculumTopic } from '@/hooks/useCurriculumTopics';
import { resolveId } from '@/lib/api-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurriculumTopicSelectionList } from '@/components/curriculum/CurriculumTopicSelectionList';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { PaperType, PaperDifficulty } from '@/types/papers';
import type { SchoolClass, Subject } from '@/types';

import {
  DIFFICULTY_OPTIONS,
  LENGTH_PRESETS,
  PAPER_TYPES,
  classGradeName,
  entityId,
  type ClassWithGrade,
  type EntityWithId,
  type PaperMetadataState,
} from './paper-wizard-helpers';

// Re-export so existing importers of the step keep working.
export type { PaperMetadataState };

interface Props {
  value: PaperMetadataState;
  onChange: (patch: Partial<PaperMetadataState>) => void;
  onCancel: () => void;
  onNext: () => void;
}

export function PaperWizardStep1({ value, onChange, onCancel, onNext }: Props) {
  const { subjects } = useTeacherSubjects(value.gradeId || undefined);
  const { classes } = useTeacherClasses();
  const { topics, loading: topicsLoading } = useCurriculumTopics({
    subjectId: value.subjectId,
    gradeId: value.gradeId,
  });

  const gradeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const cls of classes as ClassWithGrade[]) {
      const id = resolveId(cls.gradeId);
      if (id && !map.has(id)) map.set(id, classGradeName(cls));
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [classes]);

  const subjectOptions = useMemo(() => (
    (subjects as Array<Subject & EntityWithId>)
      .map((subject) => ({
        id: entityId(subject),
        name: subject.name,
      }))
      .filter((subject) => subject.id)
  ), [subjects]);

  const selectedGradeName = gradeOptions.find((grade) => grade.id === value.gradeId)?.name;
  const selectedSubjectName = subjectOptions.find((subject) => subject.id === value.subjectId)?.name;
  const selectedPaperType = PAPER_TYPES.find((type) => type.value === value.paperType);
  const topicOptions = useMemo(() => (
    topics.map((topic: CurriculumTopic) => ({
      id: topic._id,
      title: topic.title,
      code: topic.code,
    }))
  ), [topics]);
  const canAdvance = !!(
    value.subjectId &&
    value.gradeId &&
    value.topicIds.length > 0 &&
    value.totalMarks > 0 &&
    value.totalMarks <= 500 &&
    value.duration > 0 &&
    value.duration <= 480 &&
    value.year >= 2000 &&
    value.year <= 2100
  );

  const choosePaperType = (paperType: (typeof PAPER_TYPES)[number]): void => {
    onChange({
      paperType: paperType.value,
      totalMarks: paperType.marks,
      duration: paperType.duration,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Paper Setup</h2>
        <p className="text-sm text-muted-foreground">
          Choose the CAPS coverage, then let AI build the paper and memo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>
            Grade <span className="text-destructive">*</span>
          </Label>
          <Select
            value={value.gradeId || null}
            onValueChange={(nextValue: string | null) =>
              onChange({ gradeId: nextValue ?? '', subjectId: '', topicIds: [] })
            }
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Select grade">{selectedGradeName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map((grade: { id: string; name: string }) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Subject <span className="text-destructive">*</span>
          </Label>
          <Select
            value={value.subjectId || null}
            onValueChange={(nextValue: string | null) =>
              onChange({ subjectId: nextValue ?? '', topicIds: [] })
            }
            disabled={!value.gradeId}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Select subject">{selectedSubjectName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map((subject: { id: string; name: string }) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Term <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onChange({ term, topicIds: [] })}
                className={cn(
                  'h-11 rounded-lg border text-sm font-medium transition-colors',
                  value.term === term
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted',
                )}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <Label>
          CAPS Topics <span className="text-destructive">*</span>
        </Label>
        {!value.subjectId || !value.gradeId ? (
          <div className="rounded-lg border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
            Select a grade and subject.
          </div>
        ) : (
          <CurriculumTopicSelectionList
            topics={topicOptions}
            selectedIds={value.topicIds}
            onSelectedIdsChange={(topicIds) => onChange({ topicIds })}
            multiple
            loading={topicsLoading}
            emptyText="No CAPS topics found for this selection."
            searchPlaceholder="Search CAPS topics..."
          />
        )}
      </section>

      <section className="space-y-3">
        <Label>Paper Type</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {PAPER_TYPES.map((paperType) => (
            <button
              key={paperType.value}
              type="button"
              onClick={() => choosePaperType(paperType)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                value.paperType === paperType.value
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:bg-muted',
              )}
            >
              <span className="block text-sm font-semibold">{paperType.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{paperType.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="space-y-3">
          <Label>Length</Label>
          <div className="grid grid-cols-3 gap-2">
            {LENGTH_PRESETS.map((preset) => {
              const active = value.totalMarks === preset.marks && value.duration === preset.duration;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange({ totalMarks: preset.marks, duration: preset.duration })}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-center transition-colors',
                    active ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted',
                  )}
                >
                  <span className="block text-sm font-medium">{preset.label}</span>
                  <span className="text-xs text-muted-foreground">{preset.marks} marks</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <Label>Difficulty</Label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map((difficulty) => (
              <button
                key={difficulty.value}
                type="button"
                onClick={() => onChange({ difficulty: difficulty.value })}
                className={cn(
                  'rounded-lg border px-3 py-2 text-center transition-colors',
                  value.difficulty === difficulty.value
                    ? 'border-primary bg-primary/5'
                    : 'border-input hover:bg-muted',
                )}
              >
                <span className="inline-flex items-center justify-center gap-1.5 text-sm font-medium">
                  <span className={cn('h-2 w-2 rounded-full', difficulty.dot)} />
                  {difficulty.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <details className="rounded-lg border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Advanced details</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="paper-title">Paper name</Label>
            <Input
              id="paper-title"
              value={value.title}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ title: event.target.value })
              }
              placeholder={`${selectedGradeName ?? 'Grade'} ${selectedPaperType?.label ?? 'Paper'} Term ${value.term}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paper-year">Year</Label>
            <Input
              id="paper-year"
              type="number"
              min={2000}
              max={2100}
              value={value.year}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ year: Number(event.target.value) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paper-duration">Duration</Label>
            <Input
              id="paper-duration"
              type="number"
              min={5}
              max={480}
              value={value.duration}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ duration: Number(event.target.value) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paper-marks">Total Marks</Label>
            <Input
              id="paper-marks"
              type="number"
              min={1}
              max={500}
              value={value.totalMarks}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ totalMarks: Number(event.target.value) })
              }
            />
          </div>
        </div>
      </details>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onNext} disabled={!canAdvance}>
          Next: Generate
        </Button>
      </div>
    </div>
  );
}
