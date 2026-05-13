'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface CurriculumTopicSelectionItem {
  id: string;
  title: string;
  code?: string | null;
  description?: string | null;
}

interface CurriculumTopicSelectionListProps {
  topics: CurriculumTopicSelectionItem[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  multiple?: boolean;
  loading?: boolean;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  maxHeightClassName?: string;
}

export function CurriculumTopicSelectionList({
  topics,
  selectedIds,
  onSelectedIdsChange,
  multiple = false,
  loading = false,
  disabled = false,
  searchPlaceholder = 'Search topics...',
  emptyText = 'No topics available',
  loadingText = 'Loading topics...',
  maxHeightClassName = 'max-h-72',
}: CurriculumTopicSelectionListProps) {
  const [search, setSearch] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedTopics = useMemo(
    () => topics.filter((topic) => selectedSet.has(topic.id)),
    [topics, selectedSet],
  );

  const filteredTopics = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return topics;
    return topics.filter((topic) => (
      topic.title.toLowerCase().includes(query)
      || (topic.code ?? '').toLowerCase().includes(query)
      || (topic.description ?? '').toLowerCase().includes(query)
    ));
  }, [topics, search]);

  function toggleTopic(topicId: string): void {
    if (disabled) return;
    if (!multiple) {
      onSelectedIdsChange(selectedSet.has(topicId) ? [] : [topicId]);
      return;
    }
    onSelectedIdsChange(
      selectedSet.has(topicId)
        ? selectedIds.filter((id) => id !== topicId)
        : [...selectedIds, topicId],
    );
  }

  function removeTopic(topicId: string): void {
    onSelectedIdsChange(selectedIds.filter((id) => id !== topicId));
  }

  return (
    <div className="space-y-3">
      {selectedTopics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTopics.map((topic) => (
            <span
              key={topic.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border bg-primary/5 px-2.5 py-1 text-xs"
            >
              <span className="truncate">{topic.title}</span>
              <button
                type="button"
                onClick={() => removeTopic(topic.id)}
                className="rounded-full text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${topic.title}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder}
        disabled={disabled || loading || topics.length === 0}
      />

      <div className={cn('overflow-y-auto rounded-lg border p-2', maxHeightClassName)}>
        {loading ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            {loadingText}
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            {topics.length === 0 ? emptyText : 'No topics match your search'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTopics.map((topic) => {
              const checked = selectedSet.has(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  disabled={disabled}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                    checked
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input',
                    )}
                  >
                    {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{topic.title}</span>
                    {topic.code && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {topic.code}
                      </span>
                    )}
                    {topic.description && (
                      <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                        {topic.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {multiple && selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {selectedIds.length} topic{selectedIds.length === 1 ? '' : 's'} selected
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectedIdsChange([])}
            className="h-7 px-2 text-xs"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
