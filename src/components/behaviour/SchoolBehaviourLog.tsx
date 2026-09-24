'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BehaviourFeed } from '@/components/behaviour/BehaviourFeed';
import type { BehaviourFeedEntry, BehaviourSummary } from '@/hooks/useBehaviour';
import { summaryLine } from '@/lib/behaviour';

interface Props {
  kind: string;
  onKindChange: (kind: string) => void;
  entries: BehaviourFeedEntry[];
  summary: BehaviourSummary;
  loading: boolean;
  error: string | null;
  onUndo: (entry: BehaviourFeedEntry) => void;
}

const KINDS = [
  { value: 'all', label: 'Everything' },
  { value: 'merit', label: 'Merits' },
  { value: 'demerit', label: 'Demerits' },
  { value: 'incident', label: 'Incidents' },
];

/** Every merit, demerit and incident logged at the school, newest first. */
export function SchoolBehaviourLog({ kind, onKindChange, entries, summary, loading, error, onUndo }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{summaryLine(summary)} · the latest 100</p>
        <Select value={kind || 'all'} onValueChange={(v: unknown) => onKindChange(v === 'all' ? '' : String(v))}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Show">
            <SelectValue>{KINDS.find((k) => k.value === (kind || 'all'))?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <BehaviourFeed entries={entries} loading={loading} error={error} onUndo={onUndo} />
    </div>
  );
}
