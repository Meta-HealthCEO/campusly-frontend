'use client';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { MarkingItemType, MarkingPriority } from '@/types';

interface Filters {
  type?: MarkingItemType;
  priority?: MarkingPriority;
}

interface Props {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function MarkingFilters({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select
        value={filters.type ?? 'all'}
        onValueChange={(val: unknown) => {
          const v = val as string;
          onFiltersChange({
            ...filters,
            type: v === 'all' ? undefined : (v as MarkingItemType),
          });
        }}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="homework">Homework</SelectItem>
          <SelectItem value="paper">Test papers</SelectItem>
          <SelectItem value="assessment">Assessment</SelectItem>
          <SelectItem value="ai_grading">AI marking</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? 'all'}
        onValueChange={(val: unknown) => {
          const v = val as string;
          onFiltersChange({
            ...filters,
            priority: v === 'all' ? undefined : (v as MarkingPriority),
          });
        }}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="All Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any priority</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={sortBy}
        onValueChange={(val: unknown) => onSortChange(val as string)}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Sort By" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dueDate">Due date</SelectItem>
          <SelectItem value="pendingCount">Most to mark</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
