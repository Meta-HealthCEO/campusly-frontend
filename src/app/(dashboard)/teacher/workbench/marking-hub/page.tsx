'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, AlertCircle, Clock, ListChecks, Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import { PageHeader } from '@/components/shared/PageHeader';
import { sectionEyebrow } from '@/lib/eyebrow';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MarkingItemCard } from '@/components/workbench/marking-hub/MarkingItemCard';
import { MarkingFilters } from '@/components/workbench/marking-hub/MarkingFilters';
import { useMarkingHub } from '@/hooks/useMarkingHub';
import { submissionsToMark } from '@/lib/marking-due';
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
  const { items, loading, overdueCount, dueTodayCount } = useMarkingHub();

  const [filters, setFilters] = useState<Filters>({});
  const [sortBy, setSortBy] = useState('dueDate');

  const filtered = filterItems(items, filters);
  const sorted = sortItems(filtered, sortBy);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={sectionEyebrow('Assess')}
        title="Marking"
        description="Everything waiting to be marked. Photograph handwritten scripts and let AI mark them against your memo."
      >
        <Link href={ROUTES.TEACHER_CURRICULUM_MARK_PAPERS} className={buttonVariants()}>
          <Sparkles className="h-4 w-4" />
          Mark papers with AI
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Submissions to mark"
          value={String(submissionsToMark(items))}
          description={`Across ${items.length} task${items.length === 1 ? '' : 's'}`}
          icon={ListChecks}
        />
        <StatCard
          title="Overdue tasks"
          value={String(overdueCount)}
          icon={AlertCircle}
          tone={overdueCount > 0 ? 'attention' : 'default'}
        />
        <StatCard
          title="Tasks due today"
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
