'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface TermYearFilterProps {
  term: number;
  year: number;
  onTermChange: (t: number) => void;
  onYearChange: (y: number) => void;
  showAllTerms?: boolean;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function TermYearFilter({ term, year, onTermChange, onYearChange, showAllTerms = false }: TermYearFilterProps) {
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Term</Label>
        <Select
          value={String(term)}
          onValueChange={(val: unknown) => onTermChange(Number(val))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {showAllTerms && <SelectItem value="0">All Terms</SelectItem>}
            <SelectItem value="1">Term 1</SelectItem>
            <SelectItem value="2">Term 2</SelectItem>
            <SelectItem value="3">Term 3</SelectItem>
            <SelectItem value="4">Term 4</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Year</Label>
        <Select
          value={String(year)}
          onValueChange={(val: unknown) => onYearChange(Number(val))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
