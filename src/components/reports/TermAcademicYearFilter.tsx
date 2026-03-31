'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';

interface TermAcademicYearFilterProps {
  term: string;
  academicYear: string;
  onTermChange: (value: string) => void;
  onAcademicYearChange: (value: string) => void;
  onReset: () => void;
}

const TERMS = [
  { value: '1', label: 'Term 1' },
  { value: '2', label: 'Term 2' },
  { value: '3', label: 'Term 3' },
  { value: '4', label: 'Term 4' },
];

export function TermAcademicYearFilter({
  term,
  academicYear,
  onTermChange,
  onAcademicYearChange,
  onReset,
}: TermAcademicYearFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Term</label>
        <Select value={term || undefined} onValueChange={(v: unknown) => onTermChange(v as string)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All terms" />
          </SelectTrigger>
          <SelectContent>
            {TERMS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
        <Input
          type="number"
          placeholder="e.g. 2026"
          value={academicYear}
          onChange={(e) => onAcademicYearChange(e.target.value)}
          min={2020}
          max={2030}
          className="w-28"
        />
      </div>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw className="mr-1 h-3 w-3" />
        Reset
      </Button>
    </div>
  );
}
