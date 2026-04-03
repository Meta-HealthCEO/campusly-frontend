'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import type { PacingUpdate, TopicUpdateEntry, TopicStatus } from '@/types';

interface PacingUpdateHistoryProps {
  updates: PacingUpdate[];
}

function TopicStatusBadge({ status }: { status: TopicStatus }) {
  const map: Record<TopicStatus, { label: string; className: string }> = {
    completed: { label: 'Completed', className: 'bg-emerald-600 text-white' },
    in_progress: { label: 'In Progress', className: 'bg-amber-500 text-white' },
    not_started: { label: 'Not Started', className: '' },
    skipped: { label: 'Skipped', className: 'bg-muted text-muted-foreground' },
  };
  const config = map[status] ?? { label: status, className: '' };
  return <Badge className={config.className}>{config.label}</Badge>;
}

function TopicUpdateRow({ entry }: { entry: TopicUpdateEntry }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 border-b last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TopicStatusBadge status={entry.status} />
        <span className="text-sm truncate text-muted-foreground">
          Topic ID: {entry.topicId}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
        {entry.percentComplete !== undefined && (
          <span>{entry.percentComplete}% complete</span>
        )}
        {entry.completedDate && (
          <span>Done: {entry.completedDate.slice(0, 10)}</span>
        )}
      </div>
      {entry.notes && (
        <p className="text-xs text-muted-foreground italic w-full sm:w-auto">{entry.notes}</p>
      )}
    </div>
  );
}

function UpdateCard({ update }: { update: PacingUpdate }) {
  const [expanded, setExpanded] = useState(false);

  const deliveredColor =
    update.plannedContentDelivered >= 80
      ? 'text-emerald-600'
      : update.plannedContentDelivered >= 50
        ? 'text-amber-600'
        : 'text-destructive';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">
            Week ending {update.weekEnding.slice(0, 10)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${deliveredColor}`}>
              {update.plannedContentDelivered}% delivered
            </span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {update.overallNotes && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            <span className="font-medium text-foreground">Notes: </span>
            {update.overallNotes}
          </p>
        )}
        {update.challengesFaced && (
          <p className="text-sm text-destructive/80 line-clamp-2">
            <span className="font-medium text-destructive">Challenges: </span>
            {update.challengesFaced}
          </p>
        )}
        {expanded && update.topicUpdates.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Topic Updates ({update.topicUpdates.length})
            </p>
            {update.topicUpdates.map((entry) => (
              <TopicUpdateRow key={entry.topicId} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PacingUpdateHistory({ updates }: PacingUpdateHistoryProps) {
  if (updates.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No updates yet"
        description="Weekly pacing updates will appear here once teachers submit them."
      />
    );
  }

  return (
    <div className="space-y-3">
      {updates.map((update) => (
        <UpdateCard key={update.id} update={update} />
      ))}
    </div>
  );
}
