'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TERM_OPTIONS } from '@/components/grades/grades-page-helpers';
import type { SchoolClass } from '@/types';

interface Props {
  classes: SchoolClass[];
  selectedClass: string;
  classLabel: string;
  onClassChange: (classId: string) => void;
  selectedTerm: string;
  termLabel: string;
  onTermChange: (term: string) => void;
}

const gradeName = (cls: SchoolClass): string =>
  String(cls.grade?.name ?? (cls as unknown as Record<string, unknown>).gradeName ?? '');

/** The gradebook's class and term: every tab works on this pair. */
export function GradebookPickers({ classes, selectedClass, classLabel, onClassChange, selectedTerm, termLabel, onTermChange }: Props) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <Select value={selectedClass} onValueChange={(val: unknown) => onClassChange(val as string)}>
        <SelectTrigger className="w-full sm:w-64" aria-label="Class">
          <SelectValue placeholder="Pick class">{selectedClass ? classLabel : 'Pick class'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {classes.map((cls: SchoolClass) => (
            <SelectItem key={cls.id} value={cls.id}>
              {gradeName(cls)} {cls.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedTerm} onValueChange={(val: unknown) => onTermChange(val as string)}>
        <SelectTrigger className="w-full sm:w-32" aria-label="Term">
          <SelectValue>{termLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {TERM_OPTIONS.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
