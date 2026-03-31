'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onReset: () => void;
  children?: React.ReactNode;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
  children,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Start Date</label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          max={endDate || undefined}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">End Date</label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          min={startDate || undefined}
          className="w-40"
        />
      </div>
      {children}
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw className="mr-1 h-3 w-3" />
        Reset
      </Button>
    </div>
  );
}
