'use client';

import { Button } from '@/components/ui/button';
import { type ColumnDef } from '@/components/shared/DataTable';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  SubstituteStatusBadge,
  SubstituteCategoryBadge,
} from './SubstituteBadges';
import type { SubstituteTeacher } from '@/types';

function getTeacherName(
  val: SubstituteTeacher['originalTeacherId'],
): string {
  if (typeof val === 'object' && val !== null) {
    return `${val.firstName ?? ''} ${val.lastName ?? ''}`.trim() || 'Unknown';
  }
  return 'Unknown';
}

function getClassNames(classIds: SubstituteTeacher['classIds']): string {
  return classIds
    .map((c) => (typeof c === 'object' && c !== null ? c.name ?? '' : ''))
    .filter(Boolean)
    .join(', ') || '-';
}

export interface SubstituteRowActions {
  onApprove: (id: string) => void;
  onDecline: (sub: SubstituteTeacher) => void;
  onEdit: (sub: SubstituteTeacher) => void;
  onDelete: (id: string) => void;
}

export function buildSubstituteColumns(
  actions: SubstituteRowActions,
): ColumnDef<SubstituteTeacher, unknown>[] {
  return [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'originalTeacherId',
      header: 'Original',
      cell: ({ row }) => (
        <span className="truncate">{getTeacherName(row.original.originalTeacherId)}</span>
      ),
    },
    {
      accessorKey: 'substituteTeacherId',
      header: 'Substitute',
      cell: ({ row }) => (
        <span className="truncate">{getTeacherName(row.original.substituteTeacherId)}</span>
      ),
    },
    {
      accessorKey: 'periods',
      header: 'Periods',
      cell: ({ row }) => row.original.isFullDay
        ? 'Full day'
        : row.original.periods.map((p: number) => `P${p}`).join(', '),
    },
    {
      accessorKey: 'classIds',
      header: 'Classes',
      cell: ({ row }) => (
        <span className="text-sm truncate">{getClassNames(row.original.classIds)}</span>
      ),
    },
    {
      accessorKey: 'reasonCategory',
      header: 'Category',
      cell: ({ row }) => (
        <SubstituteCategoryBadge category={row.original.reasonCategory} />
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <SubstituteStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const sub = row.original;
        const isPending = sub.status === 'pending';
        return (
          <div className="flex items-center justify-end gap-1">
            {isPending && (
              <>
                <Button
                  size="sm"
                  onClick={() => actions.onApprove(sub._id)}
                >
                  <Check className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Approve</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => actions.onDecline(sub)}
                >
                  <X className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Decline</span>
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => actions.onEdit(sub)}
              aria-label="Edit substitute"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => actions.onDelete(sub._id)}
              aria-label="Delete substitute"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}
