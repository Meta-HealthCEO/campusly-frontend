'use client';

import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LineItem, LineItemStatus, StructureStatus } from '@/types';

type BadgeVariant = 'secondary' | 'default' | 'outline';

const STATUS_BADGE: Record<LineItemStatus, BadgeVariant> = {
  pending: 'secondary',
  capturing: 'default',
  closed: 'outline',
};

const STATUS_LABEL: Record<LineItemStatus, string> = {
  pending: 'Pending',
  capturing: 'Capturing',
  closed: 'Closed',
};

interface Props {
  item: LineItem;
  structureStatus: StructureStatus;
  onUpdateStatus: (status: LineItemStatus) => void;
  onDelete: () => void;
}

export function LineItemRow({ item, structureStatus, onUpdateStatus, onDelete }: Props) {
  const isActive = structureStatus === 'active';
  const isLocked = structureStatus === 'locked';

  return (
    <div className="group flex flex-wrap items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium truncate">{item.name}</span>
        <span className="text-xs text-muted-foreground">{item.totalMarks} marks</span>
        {item.date && (
          <span className="text-xs text-muted-foreground">{item.date}</span>
        )}
        {item.weight != null && (
          <span className="text-xs text-muted-foreground">{item.weight}%</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant={STATUS_BADGE[item.status]}>
          {STATUS_LABEL[item.status]}
        </Badge>

        {isActive && item.status === 'pending' && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={() => onUpdateStatus('capturing')}
          >
            Start
          </Button>
        )}

        {isActive && item.status === 'closed' && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={() => onUpdateStatus('capturing')}
          >
            Reopen
          </Button>
        )}

        {!isLocked && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>
    </div>
  );
}
