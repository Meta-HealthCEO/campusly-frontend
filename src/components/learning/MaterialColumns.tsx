'use client';

import { FileText, Video, ClipboardList, Link2, File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { ColumnDef } from '@/components/shared/DataTable';
import type { StudyMaterial } from './types';
import { getPopulatedName, getTeacherName } from './types';

const typeIcons: Record<string, typeof FileText> = {
  notes: FileText,
  video: Video,
  past_paper: ClipboardList,
  link: Link2,
  document: File,
};

const typeStyles: Record<string, string> = {
  notes: 'bg-blue-100 text-blue-800',
  video: 'bg-purple-100 text-purple-800',
  past_paper: 'bg-amber-100 text-amber-800',
  link: 'bg-teal-100 text-teal-800',
  document: 'bg-slate-100 text-slate-800',
};

const typeLabels: Record<string, string> = {
  notes: 'Notes',
  video: 'Video',
  past_paper: 'Past Paper',
  link: 'Link',
  document: 'Document',
};

export function getMaterialColumns(
  onDelete: (id: string) => void,
  onDownload: (material: StudyMaterial) => void
): ColumnDef<StudyMaterial>[] {
  return [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: ({ row }) => getPopulatedName(row.original.subjectId),
    },
    {
      id: 'grade',
      header: 'Grade',
      cell: ({ row }) => getPopulatedName(row.original.gradeId),
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }) => {
        const Icon = typeIcons[row.original.type] ?? FileText;
        return (
          <Badge variant="secondary" className={typeStyles[row.original.type] ?? ''}>
            <Icon className="mr-1 h-3 w-3" />
            {typeLabels[row.original.type] ?? row.original.type}
          </Badge>
        );
      },
    },
    {
      id: 'uploadedBy',
      header: 'Uploaded By',
      cell: ({ row }) => getTeacherName(row.original.teacherId),
    },
    {
      id: 'uploadDate',
      header: 'Uploaded',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'downloads',
      header: 'Downloads',
      cell: ({ row }) => row.original.downloads,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={() => onDownload(row.original)}>
            Open
          </Button>
          <Button size="xs" variant="outline" className="text-destructive" onClick={() => onDelete(row.original.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];
}
