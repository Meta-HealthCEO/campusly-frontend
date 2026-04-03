'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2 } from 'lucide-react';
import type { ContentResourceItem } from '@/types';

interface ResourcePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (resource: ContentResourceItem) => void;
  onSearch: (search?: string) => Promise<ContentResourceItem[]>;
  /** Resource IDs already in this chapter */
  existingIds: Set<string>;
}

export function ResourcePickerDialog({
  open,
  onOpenChange,
  onSelect,
  onSearch,
  existingIds,
}: ResourcePickerDialogProps) {
  const [results, setResults] = useState<ContentResourceItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const doSearch = useCallback(async () => {
    setSearching(true);
    try {
      const found = await onSearch(query || undefined);
      setResults(found);
    } finally {
      setSearching(false);
    }
  }, [onSearch, query]);

  const handleOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setQuery('');
        setResults([]);
        // Auto-search on open
        setSearching(true);
        onSearch(undefined)
          .then((found: ContentResourceItem[]) => setResults(found))
          .finally(() => setSearching(false));
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, onSearch],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
        </DialogHeader>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') doSearch();
              }}
              className="pl-9 w-full"
            />
          </div>
          <Button onClick={doSearch} disabled={searching} size="default">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1.5 min-h-[200px]">
          {searching && results.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Searching...
            </div>
          )}

          {!searching && results.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No resources found. Try a different search.
            </div>
          )}

          {results.map((resource: ContentResourceItem) => {
            const alreadyAdded = existingIds.has(resource.id);
            return (
              <div
                key={resource.id}
                className="flex items-center gap-2 rounded-lg border p-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{resource.title}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                    <Badge variant="outline" className="text-xs">{resource.format}</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={alreadyAdded ? 'secondary' : 'default'}
                  disabled={alreadyAdded}
                  onClick={() => onSelect(resource)}
                  className="shrink-0"
                >
                  {alreadyAdded ? 'Added' : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
