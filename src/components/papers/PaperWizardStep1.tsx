'use client';

import { useMemo } from 'react';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useCurriculumTopics, type CurriculumTopic } from '@/hooks/useCurriculumTopics';
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
import type { PaperType, PaperDifficulty } from '@/types/papers';
import type { SchoolClass, Subject } from '@/types';

const PAPER_TYPES: PaperType[] = [
  'class_test',
  'assignment',
  'mid_year',
  'trial',
  'final',
  'custom',
];

const PAPER_TYPE_LABELS: Record<PaperType, string> = {
  class_test: 'Class Test',
  assignment: 'Assignment',
  mid_year: 'Mid-Year Exam',
  trial: 'Trial Exam',
  final: 'Final Exam',
  custom: 'Custom',
};

export interface PaperMetadataState {
  title: string;
  subjectId: string;
  gradeId: string;
  topicIds: string[];
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  totalMarks: number;
  difficulty: PaperDifficulty;
}

interface Props {
  value: PaperMetadataState;
  onChange: (patch: Partial<PaperMetadataState>) => void;
  onCancel: () => void;
  onNext: () => void;
}

export function PaperWizardStep1({ value, onChange, onCancel, onNext }: Props) {
  const { subjects } = useTeacherSubjects();
  const { classes } = useTeacherClasses();
  const { topics, loading: topicsLoading } = useCurriculumTopics({
    subjectId: value.subjectId,
    gradeId: value.gradeId,
  });

  const gradeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes as SchoolClass[]) {
      const gid = c.gradeId;
      const gname = c.grade?.name ?? c.gradeName ?? 'Grade';
      if (gid && !map.has(gid)) map.set(gid, gname);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [classes]);

  const canAdvance = !!(
    value.title.trim() &&
    value.subjectId &&
    value.gradeId &&
    value.topicIds.length > 0 &&
    value.totalMarks > 0 &&
    value.duration > 0
  );

  const toggleTopic = (id: string): void => {
    const next = value.topicIds.includes(id)
      ? value.topicIds.filter((t: string) => t !== id)
      : [...value.topicIds, id];
    onChange({ topicIds: next });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Step 1 of 2 — Metadata</h2>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="paper-title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="paper-title"
            value={value.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ title: e.target.value })
            }
            placeholder="e.g. Term 2 Maths Test"
          />
        </div>

        <div className="space-y-2">
          <Label>
            Subject <span className="text-destructive">*</span>
          </Label>
          <Select
            value={value.subjectId}
            onValueChange={(val: unknown) =>
              onChange({ subjectId: val as string, topicIds: [] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {(subjects as Subject[]).map((s: Subject) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Grade <span className="text-destructive">*</span>
          </Label>
          <Select
            value={value.gradeId}
            onValueChange={(val: unknown) =>
              onChange({ gradeId: val as string, topicIds: [] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map((g: { id: string; name: string }) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Term <span className="text-destructive">*</span>
          </Label>
          <Select
            value={String(value.term)}
            onValueChange={(val: unknown) => onChange({ term: Number(val as string) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((t: number) => (
                <SelectItem key={t} value={String(t)}>
                  Term {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paper-year">Year</Label>
          <Input
            id="paper-year"
            type="number"
            min={2000}
            max={2100}
            value={value.year}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ year: Number(e.target.value) })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Paper Type</Label>
          <Select
            value={value.paperType}
            onValueChange={(val: unknown) => onChange({ paperType: val as PaperType })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAPER_TYPES.map((t: PaperType) => (
                <SelectItem key={t} value={t}>
                  {PAPER_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paper-duration">Duration (min)</Label>
          <Input
            id="paper-duration"
            type="number"
            min={5}
            max={480}
            value={value.duration}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ duration: Number(e.target.value) })
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ totalMarks: Number(e.target.value) })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select
            value={value.difficulty}
            onValueChange={(val: unknown) => onChange({ difficulty: val as PaperDifficulty })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['easy', 'medium', 'hard'] as PaperDifficulty[]).map((d: PaperDifficulty) => (
                <SelectItem key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label>
            CAPS Topics <span className="text-destructive">*</span>
          </Label>
          {!value.subjectId || !value.gradeId ? (
            <p className="text-sm text-muted-foreground">
              Select subject and grade first.
            </p>
          ) : topicsLoading ? (
            <p className="text-sm text-muted-foreground">Loading topics...</p>
          ) : topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No CAPS topics for this subject and grade.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {topics.map((t: CurriculumTopic) => {
                const checked = value.topicIds.includes(t._id);
                return (
                  <label
                    key={t._id}
                    className="flex items-start gap-2 p-2 cursor-pointer hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggleTopic(t._id)}
                    />
                    <div className="text-sm min-w-0 flex-1">
                      <div className="font-medium truncate">{t.title}</div>
                      {t.code && (
                        <div className="text-xs text-muted-foreground truncate">
                          {t.code}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {value.topicIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {value.topicIds.length} topic
              {value.topicIds.length === 1 ? '' : 's'} selected
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onNext} disabled={!canAdvance}>
          Next: Configure
        </Button>
      </div>
    </div>
  );
}
