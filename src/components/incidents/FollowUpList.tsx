'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';
import type { IncidentAction, ActionStatus } from '@/types';

const STATUS_COLORS: Record<ActionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  in_progress: 'default',
  completed: 'secondary',
  overdue: 'destructive',
};

interface FollowUpListProps {
  actions: IncidentAction[];
  onComplete?: (actionId: string) => void;
}

export function FollowUpList({ actions, onComplete }: FollowUpListProps) {
  if (actions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No follow-up actions yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <div
          key={action.id}
          className="flex items-start gap-3 rounded-lg border p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{action.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due: {new Date(action.dueDate).toLocaleDateString()}
              </span>
              {action.assignedTo && (
                <span>
                  Assigned: {action.assignedTo.firstName} {action.assignedTo.lastName}
                </span>
              )}
            </div>
            {action.notes && (
              <p className="text-xs text-muted-foreground mt-1">{action.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={STATUS_COLORS[action.status]}>
              {action.status.replace(/_/g, ' ')}
            </Badge>
            {action.status !== 'completed' && onComplete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onComplete(action.id)}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
