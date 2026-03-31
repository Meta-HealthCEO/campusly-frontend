'use client';

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EVENT_TYPE_LABELS } from './types';
import type { EventType } from './types';

interface EventFilterBarProps {
  filterType: EventType | 'all';
  onFilterChange: (type: EventType | 'all') => void;
}

export function EventFilterBar({ filterType, onFilterChange }: EventFilterBarProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={filterType}
        onValueChange={(val: unknown) => onFilterChange(val as EventType | 'all')}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([val, label]) => (
            <SelectItem key={val} value={val}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
