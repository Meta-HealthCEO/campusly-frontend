'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, AlertCircle, Clock, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MarkingItemCard } from '@/components/workbench/marking-hub/MarkingItemCard';
import { MarkingFilters } from '@/components/workbench/marking-hub/MarkingFilters';
import { useMarkingHub } from '@/hooks/useMarkingHub';
import type { MarkingItemType, MarkingPriority, MarkingItem } from '@/types';

interface Filters {
  type?: MarkingItemType;
  priority?: MarkingPriority;
}

function sortItems(items: MarkingItem[], sortBy: string): MarkingItem[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'pendingCount') return b.pendingCount - a.pendingCount;
    return a.dueDate < b.dueDate ? -1 : 1;
  });
}

function filterItems(items: MarkingItem[], filters: Filters): MarkingItem[] {
  return items.filter((item) => {
    if (filters.type && item.type !== filters.type) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    return true;
  });
}

export default function MarkingHubPage() {
  const router = useRouter();
  const { items, loading, overdueCount, dueTodayCount } = useMarkingHub();

  const [filters, setFilters] = useState<Filters>({});
  const [sortBy, setSortBy] = useState('dueDate');

  function handleCardClick(item: MarkingItem) {
    if (item.type === 'homework') {
      router.push(`/teacher/homework/${item.id}`);
    } else if (item.type === 'assessment') {
      router.push('/teacher/grades');
    } else {
      router.push('/teacher/ai-tools/grading');
    }
  }

  const filtered = filterItems(items, filters);
  const sorted = sortItems(filtered, sortBy);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Marking Hub"
        description="Track and manage all pending marking tasks"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Pending"
          value={String(items.length)}
          icon={ListChecks}
        />
        <StatCard
          title="Overdue (High Priority)"
          value={String(overdueCount)}
          icon={AlertCircle}
        />
        <StatCard
          title="Due Today"
          value={String(dueTodayCount)}
          icon={Clock}
        />
      </div>

      <MarkingFilters
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {loading ? (
        <LoadingSpinner />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No marking items"
          description="All caught up! No pending marking tasks match your filters."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((item) => (
            <MarkingItemCard
              key={item.id}
              item={item}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
