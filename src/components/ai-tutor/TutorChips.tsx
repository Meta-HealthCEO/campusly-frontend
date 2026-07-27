'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, type LucideIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Subject, TutorMode } from '@/types';

interface SubjectChipProps {
  subjects: Subject[];
  selectedId: string;
  selectedName: string;
  grade: number;
  onSelect: (subjectId: string) => void;
  disabled?: boolean;
}

/**
 * Compact chip showing the current subject + grade, click to open a searchable
 * subject picker. Replaces the old SessionSetupPanel + SubjectSelector pair.
 */
export function SubjectChip({
  subjects,
  selectedId,
  selectedName,
  grade,
  onSelect,
  disabled,
}: SubjectChipProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = query
    ? subjects.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : subjects;

  const label = selectedName
    ? grade > 0
      ? `${selectedName} · Gr ${grade}`
      : selectedName
    : 'Pick a subject';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition',
          'hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
          selectedName ? 'border-border bg-background' : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
        )}
      >
        <span className="truncate max-w-48">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search subjects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No subjects match
            </p>
          ) : (
            filtered.map((subject) => {
              const active = subject.id === selectedId;
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => {
                    onSelect(subject.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-accent',
                    active && 'bg-primary/5 font-medium text-primary',
                  )}
                >
                  <span className="truncate">{subject.name}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Topic Chip ─────────────────────────────────────────────────────────────

export interface TopicOption {
  id: string;
  title: string;
  code?: string;
  /** Children rendered as indented sub-items in the picker. */
  subtopics?: Array<{ id: string; title: string; code?: string }>;
}

interface TopicChipProps {
  topics: TopicOption[];
  selectedId: string;
  selectedTitle: string;
  /** Optional free-text override when the student picks "Other". */
  customTitle: string;
  onSelectTopic: (id: string, title: string) => void;
  onSelectCustom: (title: string) => void;
  onClear: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Optional CAPS-aligned topic picker that narrows the tutor to a specific
 * syllabus topic. Visible only once a subject is chosen. Supports a
 * structured CAPS topic OR a free-text fallback so kids can ask about
 * things not in the curriculum tree.
 */
export function TopicChip({
  topics,
  selectedId,
  selectedTitle,
  customTitle,
  onSelectTopic,
  onSelectCustom,
  onClear,
  disabled,
  loading,
}: TopicChipProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customDraft, setCustomDraft] = useState('');

  // Filter both topics and subtopics by the search query. A topic stays in the
  // list if either its own title matches OR any of its subtopics match — in
  // the latter case we only keep the matching subtopics, so the UI shows
  // exactly what was hit.
  const filtered = useMemo<TopicOption[]>(() => {
    if (!query) return topics;
    const q = query.toLowerCase();
    const matches: TopicOption[] = [];
    for (const topic of topics) {
      const topicHit = topic.title.toLowerCase().includes(q);
      const subHits = (topic.subtopics ?? []).filter((s) => s.title.toLowerCase().includes(q));
      if (topicHit) {
        matches.push(topic);
      } else if (subHits.length > 0) {
        matches.push({ ...topic, subtopics: subHits });
      }
    }
    return matches;
  }, [topics, query]);


  const display = customTitle || selectedTitle;
  const label = display || (disabled ? 'Topic' : 'Add a topic');

  const handlePickStructured = (id: string, title: string) => {
    onSelectTopic(id, title);
    setOpen(false);
    setQuery('');
    setCustomDraft('');
  };

  const handlePickCustom = () => {
    const trimmed = customDraft.trim();
    if (!trimmed) return;
    onSelectCustom(trimmed);
    setOpen(false);
    setQuery('');
    setCustomDraft('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition',
          'hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
          display
            ? 'border-border bg-background'
            : 'border-dashed border-border bg-background text-muted-foreground',
        )}
        title={display || (disabled ? 'Pick a subject first' : 'Pick a syllabus topic')}
      >
        <span className="truncate max-w-56">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder={topics.length > 0 ? 'Search topics...' : 'Type your topic...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {loading ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Loading topics...</p>
          ) : filtered.length === 0 && topics.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No syllabus topics found for this subject. Type your own below.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No topics match "{query}". Try a different word or type your own below.
            </p>
          ) : (
            filtered.map((topic) => {
              const topicActive = topic.id === selectedId;
              const subs = topic.subtopics ?? [];
              return (
                <div key={topic.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() => handlePickStructured(topic.id, topic.title)}
                    className={cn(
                      'flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-accent',
                      topicActive && 'bg-primary/5 font-medium text-primary',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{topic.title}</span>
                      {topic.code && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {topic.code}
                        </span>
                      )}
                    </span>
                    {topicActive && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                  {subs.length > 0 && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l pl-2">
                      {subs.map((sub) => {
                        const subActive = sub.id === selectedId;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() =>
                              handlePickStructured(sub.id, `${topic.title} — ${sub.title}`)
                            }
                            className={cn(
                              'flex w-full items-start justify-between gap-2 rounded-md px-2 py-1 text-left text-xs transition hover:bg-accent',
                              subActive && 'bg-primary/5 font-medium text-primary',
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">{sub.title}</span>
                            {subActive && <Check className="h-3 w-3 shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t bg-muted/30 p-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="Or type a custom topic..."
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePickCustom();
                }
              }}
              className="h-8 text-sm"
            />
            <button
              type="button"
              onClick={handlePickCustom}
              disabled={!customDraft.trim()}
              className={cn(
                'rounded-md border bg-background px-2 py-1 text-xs font-medium transition hover:border-primary/50 hover:bg-accent',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              Use
            </button>
          </div>
          {display && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition hover:bg-background hover:text-foreground"
            >
              Clear topic
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ModeOption {
  id: TutorMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

interface ModeChipProps {
  options: ModeOption[];
  selectedId: TutorMode;
  onSelect: (mode: TutorMode) => void;
  disabled?: boolean;
}

/**
 * Compact chip showing the current tutor mode. Click to open a 4-option list
 * with descriptions. Replaces the vertical mode picker that used to live in
 * the sidebar.
 */
export function ModeChip({ options, selectedId, onSelect, disabled }: ModeChipProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((m) => m.id === selectedId) ?? options[0];
  const CurrentIcon = current?.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm font-medium transition',
          'hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {CurrentIcon && <CurrentIcon className="h-3.5 w-3.5 text-primary" />}
        <span className="truncate">{current?.shortLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        {options.map((option) => {
          const Icon = option.icon;
          const active = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onSelect(option.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-start gap-3 rounded-md p-2 text-left transition hover:bg-accent',
                active && 'bg-primary/5',
              )}
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cn('text-sm font-semibold', active && 'text-primary')}>
                    {option.label}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
