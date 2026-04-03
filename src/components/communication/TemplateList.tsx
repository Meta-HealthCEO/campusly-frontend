'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { ChannelBadge } from './MessageBadges';
import type { CommTemplate } from '@/types';

interface TemplateListProps {
  templates: CommTemplate[];
  onEdit: (tpl: CommTemplate) => void;
  onDelete: (tpl: CommTemplate) => void;
}

export function TemplateList({ templates, onEdit, onDelete }: TemplateListProps) {
  const columns = useMemo<ColumnDef<CommTemplate, unknown>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium truncate max-w-[200px] inline-block">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'channel',
      header: 'Channel',
      cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">{row.original.category}</Badge>
      ),
    },
    {
      accessorKey: 'usageCount',
      header: 'Used',
      cell: ({ row }) => <span className="text-sm">{row.original.usageCount}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={row.original.isActive
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground'}
        >
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!row.original.isDefault && (
            <Button variant="ghost" size="icon-sm" onClick={() => onDelete(row.original)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ], [onEdit, onDelete]);

  return (
    <DataTable
      columns={columns}
      data={templates}
      searchKey="name"
      searchPlaceholder="Search templates..."
    />
  );
}
