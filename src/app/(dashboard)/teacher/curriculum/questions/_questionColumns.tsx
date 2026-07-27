'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ColumnDef } from '@/components/shared/DataTable';
import type { QuestionItem } from '@/types/question-bank';

/** Column set for the saved-questions table. */
export function buildQuestionColumns(
  onDelete: (question: QuestionItem) => void,
): ColumnDef<QuestionItem>[] {
  return [
    {
      accessorKey: 'stem',
      header: 'Question',
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-xl">{row.original.stem}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize text-xs">
          {row.original.type.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'capsLevel',
      header: 'CAPS',
      accessorFn: (row) => row.cognitiveLevel?.caps ?? '',
      cell: ({ getValue }) => (
        <span className="text-xs capitalize">
          {String(getValue() ?? '').replace(/_/g, ' ')}
        </span>
      ),
    },
    { accessorKey: 'marks', header: 'Marks' },
    { accessorKey: 'difficulty', header: 'Diff.' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variant: 'default' | 'secondary' | 'outline' | 'destructive' =
          status === 'approved' ? 'default'
            : status === 'rejected' ? 'destructive'
              : status === 'pending_review' ? 'secondary' : 'outline';
        return (
          <Badge variant={variant} className="capitalize text-xs">
            {status.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground capitalize">
          {row.original.source.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'usageCount',
      header: 'Used',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.usageCount}×
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          aria-label="Delete question"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];
}
