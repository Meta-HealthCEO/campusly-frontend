'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { Eye, Pencil } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Policy, PolicyCategory } from '@/types';

interface PolicyListProps {
  policies: Policy[];
  onView: (id: string) => void;
  onEdit?: (policy: Policy) => void;
}

const CATEGORY_LABELS: Record<PolicyCategory, string> = {
  hr: 'HR',
  academic: 'Academic',
  safety: 'Safety',
  financial: 'Financial',
  governance: 'Governance',
  general: 'General',
};

type CategoryVariant = 'secondary' | 'default' | 'destructive' | 'outline';

const CATEGORY_VARIANTS: Record<PolicyCategory, CategoryVariant> = {
  hr: 'secondary',
  academic: 'default',
  safety: 'destructive',
  financial: 'outline',
  governance: 'secondary',
  general: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  under_review: 'Under Review',
  archived: 'Archived',
};

const STATUS_VARIANTS: Record<string, CategoryVariant> = {
  draft: 'outline',
  active: 'default',
  under_review: 'secondary',
  archived: 'outline',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-ZA');
}

export function PolicyList({ policies, onView, onEdit }: PolicyListProps) {
  const columns = useMemo<ColumnDef<Policy>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <span className="font-medium truncate block max-w-[200px]">{row.original.title}</span>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => {
          const cat = row.original.category;
          return (
            <Badge variant={CATEGORY_VARIANTS[cat]}>
              {CATEGORY_LABELS[cat]}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge variant={STATUS_VARIANTS[status] ?? 'outline'}>
              {STATUS_LABELS[status] ?? status}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => <span>v{row.original.version}</span>,
      },
      {
        accessorKey: 'reviewDate',
        header: 'Review Date',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.reviewDate)}</span>
        ),
      },
      {
        accessorKey: 'lastReviewedAt',
        header: 'Last Reviewed',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.lastReviewedAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView(row.original.id)}
              aria-label="View policy"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(row.original)}
                aria-label="Edit policy"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [onView, onEdit],
  );

  return (
    <DataTable
      columns={columns}
      data={policies}
      searchKey="title"
      searchPlaceholder="Search policies..."
    />
  );
}
