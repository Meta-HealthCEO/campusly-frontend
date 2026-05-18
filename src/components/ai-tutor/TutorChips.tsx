'use client';

import { useState } from 'react';
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
        <span className="truncate max-w-[12rem]">{label}</span>
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
