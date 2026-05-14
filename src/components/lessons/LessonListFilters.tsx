'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LessonsFilters } from '@/hooks/useLessons';
import type { AcademicLookupItem } from '@/hooks/useAcademicLookups';
import { Search } from 'lucide-react';

interface Props {
  filters: LessonsFilters;
  onChange: (filters: LessonsFilters) => void;
  classes: AcademicLookupItem[];
  subjects: AcademicLookupItem[];
}

export function LessonListFilters({ filters, onChange, classes, subjects }: Props) {
  const update = (patch: Partial<LessonsFilters>) =>
    onChange({ ...filters, ...patch, page: 1 });

  const classValue = filters.classId ?? 'all';
  const subjectValue = filters.subjectId ?? 'all';

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search lessons..."
          value={filters.search ?? ''}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      <Select
        value={classValue}
        onValueChange={(v: unknown) =>
          update({ classId: v === 'all' ? undefined : (v as string) })
        }
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All classes</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c._id} value={c._id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={subjectValue}
        onValueChange={(v: unknown) =>
          update({ subjectId: v === 'all' ? undefined : (v as string) })
        }
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All subjects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All subjects</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s._id} value={s._id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

    </div>
  );
}
