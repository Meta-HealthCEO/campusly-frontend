'use client';

import { Button } from '@/components/ui/button';
import { type ColumnDef } from '@/components/shared/DataTable';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  getLessonPlanSubjectName,
  getLessonPlanClassName,
} from '@/lib/lesson-plan-helpers';
import type { LessonPlan } from '@/types';

interface LessonPlanColumnHandlers {
  onView: (plan: LessonPlan) => void;
  onEdit: (plan: LessonPlan) => void;
  onDelete: (id: string) => void;
}

export function buildLessonPlanColumns({
  onView,
  onEdit,
  onDelete,
}: LessonPlanColumnHandlers): ColumnDef<LessonPlan, unknown>[] {
  return [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'topic',
      header: 'Topic',
      cell: ({ row }) => (
        <span className="font-medium truncate block max-w-[200px]">{row.original.topic}</span>
      ),
    },
    {
      accessorKey: 'subjectId',
      header: 'Subject',
      cell: ({ row }) => (
        <span className="truncate block max-w-[200px]">{getLessonPlanSubjectName(row.original)}</span>
      ),
    },
    {
      accessorKey: 'classId',
      header: 'Class',
      cell: ({ row }) => (
        <span className="truncate block max-w-[200px]">{getLessonPlanClassName(row.original)}</span>
      ),
    },
    {
      accessorKey: 'objectives',
      header: 'Objectives',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.objectives.length} objective(s)
        </span>
      ),
    },
    {
      accessorKey: 'durationMinutes',
      header: 'Duration',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.durationMinutes} min
        </span>
      ),
    },
    {
      accessorKey: 'homeworkIds',
      header: 'Homework',
      cell: ({ row }) => {
        const ids = row.original.homeworkIds;
        if (!ids || ids.length === 0) {
          return <span className="text-muted-foreground text-xs">None</span>;
        }
        // list endpoint may return populated {type, title} or string[]; support both
        if (typeof ids[0] === 'object') {
          const groups: Record<'quiz' | 'reading' | 'exercise', number> = {
            quiz: 0,
            reading: 0,
            exercise: 0,
          };
          (ids as Array<{ type: 'quiz' | 'reading' | 'exercise' }>).forEach((h) => {
            groups[h.type] = (groups[h.type] ?? 0) + 1;
          });
          const parts = (['quiz', 'reading', 'exercise'] as const)
            .filter((t) => groups[t] > 0)
            .map((t) => `${groups[t]} ${t}`);
          return <span className="text-xs">{parts.join(' · ')}</span>;
        }
        const count = ids.length;
        return <span className="text-xs">{count} item{count === 1 ? '' : 's'}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 sm:h-9 sm:w-9"
            onClick={(e) => { e.stopPropagation(); onView(row.original); }}
            aria-label="View lesson plan"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 sm:h-9 sm:w-9"
            onClick={(e) => { e.stopPropagation(); onEdit(row.original); }}
            aria-label="Edit lesson plan"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 sm:h-9 sm:w-9 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(row.original._id); }}
            aria-label="Delete lesson plan"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
