'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { WSEAreaBadge } from './WSEAreaBadge';
import { Pencil } from 'lucide-react';
import type { SIPGoal, GoalStatus, GoalPriority } from '@/types';

interface SIPGoalListProps {
  goals: SIPGoal[];
  onSelect?: (id: string) => void;
  onEdit?: (goal: SIPGoal) => void;
}

const STATUS_VARIANTS: Record<GoalStatus, 'secondary' | 'outline' | 'default' | 'destructive'> = {
  not_started: 'secondary',
  in_progress: 'outline',
  completed: 'default',
  overdue: 'destructive',
};

const STATUS_LABELS: Record<GoalStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

const PRIORITY_VARIANTS: Record<GoalPriority, 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
};

const PRIORITY_LABELS: Record<GoalPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function resolveResponsible(
  rp: SIPGoal['responsiblePersonId'],
): string {
  if (!rp) return '—';
  if (typeof rp === 'string') return rp;
  return `${rp.firstName} ${rp.lastName}`;
}

export function SIPGoalList({ goals, onSelect, onEdit }: SIPGoalListProps) {
  const columns = useMemo<ColumnDef<SIPGoal, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => <span className="font-medium truncate max-w-[180px] block">{row.original.title}</span>,
      },
      {
        accessorKey: 'wseArea',
        header: 'WSE Area',
        cell: ({ row }) => <WSEAreaBadge area={row.original.wseArea} />,
      },
      {
        accessorKey: 'responsiblePersonId',
        header: 'Responsible',
        cell: ({ row }) => (
          <span className="text-sm truncate max-w-[120px] block">
            {resolveResponsible(row.original.responsiblePersonId)}
          </span>
        ),
      },
      {
        accessorKey: 'targetDate',
        header: 'Target Date',
        cell: ({ row }) => <span className="text-sm whitespace-nowrap">{formatDate(row.original.targetDate)}</span>,
      },
      {
        accessorKey: 'completionPercent',
        header: 'Completion',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.completionPercent}%</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANTS[row.original.status]}>
            {STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <Badge variant={PRIORITY_VARIANTS[row.original.priority]}>
            {PRIORITY_LABELS[row.original.priority]}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(row.original); }}
                aria-label="Edit goal"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [onEdit],
  );

  return (
    <DataTable
      columns={columns}
      data={goals}
      searchKey="title"
      searchPlaceholder="Search goals..."
      onRowClick={onSelect ? (row) => onSelect(row.id) : undefined}
    />
  );
}
