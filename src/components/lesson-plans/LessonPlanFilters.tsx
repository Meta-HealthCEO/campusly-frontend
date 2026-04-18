'use client';

import { Button } from '@/components/ui/button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import type { SchoolClass, Subject } from '@/types';

interface LessonPlanFiltersProps {
  subjects: Subject[];
  classes: SchoolClass[];
  filterSubjectId: string;
  filterClassId: string;
  onSubjectChange: (val: string) => void;
  onClassChange: (val: string) => void;
  onReset: () => void;
}

export function LessonPlanFilters({
  subjects, classes, filterSubjectId, filterClassId,
  onSubjectChange, onClassChange, onReset,
}: LessonPlanFiltersProps) {
  const hasFilters = !!(filterSubjectId || filterClassId);

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
      <div className="space-y-1 flex-1 sm:flex-initial">
        <label className="text-xs text-muted-foreground">Subject</label>
        <Select
          value={filterSubjectId || 'all'}
          onValueChange={(val: unknown) => {
            const v = val as string;
            onSubjectChange(v === 'all' ? '' : v);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s: Subject) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 flex-1 sm:flex-initial">
        <label className="text-xs text-muted-foreground">Class</label>
        <Select
          value={filterClassId || 'all'}
          onValueChange={(val: unknown) => {
            const v = val as string;
            onClassChange(v === 'all' ? '' : v);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c: SchoolClass) => (
              <SelectItem key={c.id} value={c.id}>
                {c.grade?.name ?? c.gradeName ?? ''} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="w-full sm:w-auto"
        >
          <X className="mr-2 h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
