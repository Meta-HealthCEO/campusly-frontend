'use client';

import { Star, Eye, Send, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { AnnouncementPriorityBadge } from './AnnouncementPriorityBadge';
import { AnnouncementStatusBadge, deriveStatus } from './AnnouncementStatusBadge';
import { formatDate } from '@/lib/utils';
import type { Announcement, AnnouncementAuthor } from '@/hooks/useAnnouncements';

interface AnnouncementListProps {
  announcements: Announcement[];
  onView: (announcement: Announcement) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
}

const audienceStyles: Record<string, string> = {
  all: 'bg-purple-100 text-purple-800',
  teachers: 'bg-indigo-100 text-indigo-800',
  parents: 'bg-teal-100 text-teal-800',
  students: 'bg-cyan-100 text-cyan-800',
  grade: 'bg-blue-100 text-blue-800',
  class: 'bg-orange-100 text-orange-800',
};

const audienceLabels: Record<string, string> = {
  all: 'All',
  teachers: 'Teachers',
  parents: 'Parents',
  students: 'Students',
  grade: 'Grade',
  class: 'Class',
};

function getAuthorName(authorId: AnnouncementAuthor | string): string {
  if (typeof authorId === 'string') return 'Unknown';
  return `${authorId.firstName} ${authorId.lastName}`;
}

function buildColumns(
  onView: (a: Announcement) => void,
  onPublish: (id: string) => void,
  onUnpublish: (id: string) => void,
  onDelete: (id: string) => void,
): ColumnDef<Announcement>[] {
  return [
    {
      id: 'pinned',
      header: '',
      cell: ({ row }) =>
        row.original.pinned ? (
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        ) : null,
      enableSorting: false,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      id: 'audience',
      header: 'Audience',
      accessorKey: 'targetAudience',
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={audienceStyles[row.original.targetAudience] ?? ''}
        >
          {audienceLabels[row.original.targetAudience] ?? row.original.targetAudience}
        </Badge>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      accessorKey: 'priority',
      cell: ({ row }) => (
        <AnnouncementPriorityBadge priority={row.original.priority} />
      ),
    },
    {
      id: 'date',
      header: 'Date',
      accessorKey: 'createdAt',
      cell: ({ row }) => {
        const d = row.original.publishedAt ?? row.original.createdAt;
        return d ? formatDate(d) : '-';
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <AnnouncementStatusBadge
          isPublished={row.original.isPublished}
          scheduledPublishDate={row.original.scheduledPublishDate}
        />
      ),
    },
    {
      id: 'readRate',
      header: 'Read',
      cell: ({ row }) => {
        const count = row.original.readBy.length;
        return count > 0 ? (
          <span className="font-medium">{count}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const a = row.original;
        const status = deriveStatus(a.isPublished, a.scheduledPublishDate);
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="xs" variant="outline" onClick={() => onView(a)}>
              <Eye className="mr-1 h-3 w-3" /> View
            </Button>
            {status === 'draft' || status === 'scheduled' ? (
              <Button size="xs" onClick={() => onPublish(a.id)}>
                <Send className="mr-1 h-3 w-3" /> Publish
              </Button>
            ) : (
              <Button size="xs" variant="outline" onClick={() => onUnpublish(a.id)}>
                <EyeOff className="mr-1 h-3 w-3" /> Unpublish
              </Button>
            )}
            <Button size="xs" variant="ghost" onClick={() => onDelete(a.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];
}

export function AnnouncementList({
  announcements,
  onView,
  onPublish,
  onUnpublish,
  onDelete,
}: AnnouncementListProps) {
  const columns = buildColumns(onView, onPublish, onUnpublish, onDelete);
  return (
    <DataTable
      columns={columns}
      data={announcements}
      searchKey="title"
      searchPlaceholder="Search announcements..."
    />
  );
}
