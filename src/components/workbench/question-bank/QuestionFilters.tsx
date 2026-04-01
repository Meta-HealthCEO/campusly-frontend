'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/shared';
import type { QuestionFilters, Subject, CurriculumFramework } from '@/types';

interface QuestionFiltersProps {
  filters: QuestionFilters;
  onFiltersChange: (filters: QuestionFilters) => void;
  subjects: Subject[];
  frameworks: CurriculumFramework[];
}

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const COGNITIVE_LEVELS = [
  'knowledge',
  'comprehension',
  'application',
  'analysis',
  'synthesis',
  'evaluation',
] as const;
const QUESTION_TYPES = [
  'mcq',
  'structured',
  'essay',
  'true_false',
  'matching',
  'short_answer',
  'fill_in_blank',
] as const;
const SOURCES = ['manual', 'ai_generated', 'imported'] as const;
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

function label(val: string) {
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function QuestionFilters({ filters, onFiltersChange, subjects, frameworks }: QuestionFiltersProps) {
  function set(key: keyof QuestionFilters, value: string) {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  }

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      <SearchInput
        placeholder="Search questions..."
        className="w-full sm:w-64"
        onSearch={(q) => onFiltersChange({ ...filters, tags: q ? [q] : undefined })}
      />

      <Select
        value={filters.subjectId ?? 'all'}
        onValueChange={(v: unknown) => set('subjectId', v as string)}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Subject" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All subjects</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.gradeId ?? 'all'}
        onValueChange={(v: unknown) => set('gradeId', v as string)}
      >
        <SelectTrigger className="w-full sm:w-28">
          <SelectValue placeholder="Grade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All grades</SelectItem>
          {GRADES.map((g) => (
            <SelectItem key={g} value={String(g)}>
              Grade {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.difficulty ?? 'all'}
        onValueChange={(v: unknown) => set('difficulty', v as string)}
      >
        <SelectTrigger className="w-full sm:w-32">
          <SelectValue placeholder="Difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All levels</SelectItem>
          {DIFFICULTIES.map((d) => (
            <SelectItem key={d} value={d}>
              {label(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.cognitiveLevel ?? 'all'}
        onValueChange={(v: unknown) => set('cognitiveLevel', v as string)}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Cognitive" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All cognitive</SelectItem>
          {COGNITIVE_LEVELS.map((c) => (
            <SelectItem key={c} value={c}>
              {label(c)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.type ?? 'all'}
        onValueChange={(v: unknown) => set('type', v as string)}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {QUESTION_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {label(t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.source ?? 'all'}
        onValueChange={(v: unknown) => set('source', v as string)}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {label(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
