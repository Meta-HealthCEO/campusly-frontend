'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { SchoolClass } from '@/types';

export type HomeworkListFilterState = {
  search: string;
  type: 'all' | 'quiz' | 'reading' | 'exercise';
  classId: 'all' | string;
  status: 'all' | 'assigned' | 'closed';
};

interface Props {
  value: HomeworkListFilterState;
  onChange: (next: HomeworkListFilterState) => void;
  classes: SchoolClass[];
}

export function HomeworkListFilters({ value, onChange, classes }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search title..."
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="pl-8"
        />
      </div>

      <Select
        value={value.type}
        onValueChange={(v: unknown) => {
          if (typeof v === 'string')
            onChange({ ...value, type: v as HomeworkListFilterState['type'] });
        }}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="quiz">Quiz</SelectItem>
          <SelectItem value="reading">Reading</SelectItem>
          <SelectItem value="exercise">Exercise</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.classId}
        onValueChange={(v: unknown) => {
          if (typeof v === 'string') onChange({ ...value, classId: v });
        }}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Class" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All classes</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.status}
        onValueChange={(v: unknown) => {
          if (typeof v === 'string')
            onChange({ ...value, status: v as HomeworkListFilterState['status'] });
        }}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="assigned">Assigned</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
