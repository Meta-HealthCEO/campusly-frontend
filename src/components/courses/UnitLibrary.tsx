'use client';

import { Copy, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { libraryByline, libraryMeta, type LibraryEntry } from '@/lib/unit-library';

interface Props {
  entries: LibraryEntry[];
  loading: boolean;
  error: string | null;
  onCopy: (entry: LibraryEntry) => void;
  onOpen: (entry: LibraryEntry) => void;
}

/** Every unit released at the school, for any teacher to copy to their own class. */
export function UnitLibrary({ entries, loading, error, onCopy, onOpen }: Props) {
  if (error) return <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>;
  if (loading) return <LoadingSpinner />;
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="Nothing in the library yet"
        description="When a teacher at your school releases a unit, it appears here for everyone to copy to their own class."
      />
    );
  }
  return (
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
  );
}
