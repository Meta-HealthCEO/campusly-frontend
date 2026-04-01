'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PaperModeration, ModerationStatus } from '@/types';

interface ModerationCardProps {
  moderation: PaperModeration;
  onClick: () => void;
}

function statusBadge(status: ModerationStatus): { label: string; className: string } {
  if (status === 'approved') {
    return {
      label: 'Approved',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
  }
  if (status === 'changes_requested') {
    return { label: 'Changes Requested', className: '' };
  }
  return {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ModerationCard({ moderation, onClick }: ModerationCardProps) {
  const { label, className } = statusBadge(moderation.status);
  const isChangesRequested = moderation.status === 'changes_requested';

  const latestComment =
    moderation.moderationHistory.length > 0
      ? moderation.moderationHistory[moderation.moderationHistory.length - 1].comment
      : moderation.comments;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate text-sm">
              Paper: {moderation.paperId}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted {formatDate(moderation.submittedAt)}
            </p>
          </div>
          <Badge
            variant={isChangesRequested ? 'destructive' : 'outline'}
            className={isChangesRequested ? '' : className}
          >
            {label}
          </Badge>
        </div>

        {moderation.moderatorId && (
          <p className="text-xs text-muted-foreground">
            Reviewer: {moderation.moderatorId}
          </p>
        )}

        {latestComment && (
          <p className="text-xs text-muted-foreground line-clamp-2">{latestComment}</p>
        )}
      </CardContent>
    </Card>
  );
}
