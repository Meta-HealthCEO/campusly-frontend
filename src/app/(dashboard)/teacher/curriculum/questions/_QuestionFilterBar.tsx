'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { QUESTION_TYPES, CAPS_LEVELS } from '@/components/questions/question-constants';

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All Difficulties' },
  { value: '1', label: 'Difficulty 1' },
  { value: '2', label: 'Difficulty 2' },
  { value: '3', label: 'Difficulty 3' },
  { value: '4', label: 'Difficulty 4' },
  { value: '5', label: 'Difficulty 5' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

interface QuestionFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  capsFilter: string;
  setCapsFilter: (v: string) => void;
  diffFilter: string;
  setDiffFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  mineOnly: boolean;
  toggleMineOnly: () => void;
}

export function QuestionFilterBar({
  search, setSearch, typeFilter, setTypeFilter, capsFilter, setCapsFilter,
  diffFilter, setDiffFilter, statusFilter, setStatusFilter,
  mineOnly, toggleMineOnly,
}: QuestionFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="pl-9 w-full"
        />
      </div>

      <Select value={typeFilter} onValueChange={(v: unknown) => setTypeFilter(v as string)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {QUESTION_TYPES.map((qt) => (
            <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={capsFilter} onValueChange={(v: unknown) => setCapsFilter(v as string)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="CAPS Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All CAPS Levels</SelectItem>
          {CAPS_LEVELS.map((cl) => (
            <SelectItem key={cl.value} value={cl.value}>{cl.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={diffFilter} onValueChange={(v: unknown) => setDiffFilter(v as string)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Difficulty" />
        </SelectTrigger>
        <SelectContent>
          {DIFFICULTY_OPTIONS.map((d) => (
            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as string)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={mineOnly ? 'default' : 'outline'}
        size="sm"
        onClick={toggleMineOnly}
      >
        Mine
      </Button>
    </div>
  );
}
