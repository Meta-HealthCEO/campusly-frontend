'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MarkingItem, MarkingItemType, MarkingPriority } from '@/types';

interface Props {
  item: MarkingItem;
  onClick: () => void;
}

function typeBadgeClass(type: MarkingItemType): string {
  switch (type) {
    case 'homework':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'assessment':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'ai_grading':
      return 'bg-amber-100 text-amber-700 border-amber-200';
  }
}

function typeLabel(type: MarkingItemType): string {
  switch (type) {
    case 'homework':
      return 'Homework';
    case 'assessment':
      return 'Assessment';
    case 'ai_grading':
      return 'AI Grading';
  }
}

function dueDateClass(dueDate: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (dueDate < todayStr) return 'text-destructive';
  if (dueDate === todayStr) return 'text-amber-600';
  return 'text-muted-foreground';
}

function priorityDotClass(priority: MarkingPriority): string {
  switch (priority) {
    case 'high':
      return 'bg-destructive';
    case 'medium':
      return 'bg-amber-500';
    case 'low':
      return 'bg-muted-foreground';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MarkingItemCard({ item, onClick }: Props) {
  const completedCount = item.totalCount - item.pendingCount;
  const progressPercent =
    item.totalCount > 0 ? (completedCount / item.totalCount) * 100 : 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'shrink-0 h-2 w-2 rounded-full',
                priorityDotClass(item.priority),
              )}
            />
            <h4 className="font-medium text-sm truncate">{item.title}</h4>
          </div>
          <Badge
            className={cn(
              'shrink-0 text-xs border',
              typeBadgeClass(item.type),
            )}
          >
            {typeLabel(item.type)}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground truncate">
          {item.subjectName} &middot; {item.className}
        </p>

        <p className={cn('text-xs font-medium', dueDateClass(item.dueDate))}>
          Due {formatDate(item.dueDate)}
        </p>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedCount} / {item.totalCount} marked</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
