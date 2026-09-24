'use client';

import { Copy, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { libraryByline, libraryMeta, type LibraryEntry } from '@/lib/unit-library';
import type { UnitLibraryFilters } from '@/hooks/useUnitLibrary';

interface FilterOption { id: string; name: string }

interface Props {
  entries: LibraryEntry[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  filters: UnitLibraryFilters;
  grades: FilterOption[];
  subjects: FilterOption[];
  onFiltersChange: (filters: UnitLibraryFilters) => void;
  onLoadMore: () => void;
  onCopy: (entry: LibraryEntry) => void;
  onOpen: (entry: LibraryEntry) => void;
}

/** Every unit released at the school, for any teacher to copy to their own class. */
export function UnitLibrary({
  entries, loading, loadingMore, hasMore, error, filters, grades, subjects, onFiltersChange, onLoadMore, onCopy, onOpen,
}: Props) {
  const filterBar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        value={filters.gradeId ?? 'all'}
        onValueChange={(v: unknown) => onFiltersChange({ ...filters, gradeId: v === 'all' ? undefined : (v as string) })}
      >
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All grades" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All grades</SelectItem>
          {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select
        value={filters.subjectId ?? 'all'}
        onValueChange={(v: unknown) => onFiltersChange({ ...filters, subjectId: v === 'all' ? undefined : (v as string) })}
      >
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All subjects" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All subjects</SelectItem>
          {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-3">
        {filterBar}
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>
      </div>
    );
  }
  if (loading) return <LoadingSpinner />;
  if (entries.length === 0) {
    return (
      <div className="space-y-3">
        {filterBar}
        <EmptyState
          icon={Library}
          title="Nothing in the library yet"
          description="When a teacher at your school releases a unit, it appears here for everyone to copy to their own class."
        />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {filterBar}
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" aria-label="Released units">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              {entry.mine ? (
                <button type="button" onClick={() => onOpen(entry)} className="block max-w-full truncate text-left text-sm font-medium underline-offset-2 hover:underline">
                  {entry.title}
                </button>
              ) : (
                <p className="truncate text-sm font-medium">{entry.title}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">{libraryMeta(entry)}</p>
              <p className="text-xs text-muted-foreground">{libraryByline(entry)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onCopy(entry)} aria-label={`Copy ${entry.title} to my class`} className="min-h-11 w-full gap-1.5 sm:min-h-8 sm:w-auto">
              <Copy className="h-4 w-4" aria-hidden /> Copy to my class
            </Button>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore} className="min-h-11 sm:min-h-9">
            {loadingMore ? 'Loading…' : 'Show more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
