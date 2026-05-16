'use client';

import { useRouter } from 'next/navigation';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Pencil, Trash2, UserPlus } from 'lucide-react';
import { resolveId } from '@/lib/api-helpers';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';

interface TeacherClassesTableProps {
  entries: TeacherClassEntry[];
  mode: 'class' | 'teachingGroup';
  onAddStudents: (entry: TeacherClassEntry) => void;
  onEdit: (entry: TeacherClassEntry) => void;
  onDelete: (entry: TeacherClassEntry) => void;
}

function readGradeName(entry: TeacherClassEntry): string {
  const g = entry.class.gradeId as unknown;
  if (g && typeof g === 'object' && g !== null) {
    const obj = g as Record<string, unknown>;
    if (typeof obj.name === 'string') return obj.name;
  }
  return entry.class.grade?.name ?? entry.class.gradeName ?? '';
}

export function TeacherClassesTable({
  entries,
  mode,
  onAddStudents,
  onEdit,
  onDelete,
}: TeacherClassesTableProps) {
  const router = useRouter();
  const isTeachingGroup = mode === 'teachingGroup';

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const columns: ColumnDef<TeacherClassEntry>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (e) => e.class.name,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{row.original.class.name}</span>
          {row.original.isHomeroom ? (
            <Badge variant="default" className="shrink-0 gap-1">
              <Home className="h-3 w-3" />
              Homeroom
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      id: 'grade',
      header: 'Grade',
      accessorFn: (e) => readGradeName(e),
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? (
          <Badge variant="outline">{v}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      accessorFn: (e) => e.subject?.name ?? '',
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? (
          <Badge variant="secondary">{v}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: 'learners',
      header: isTeachingGroup ? 'Learners' : 'Students',
      accessorFn: (e) => e.students?.length ?? 0,
      cell: ({ row }) => {
        const studentCount = row.original.students?.length ?? 0;
        const expected = row.original.class.capacity ?? 0;
        return (
          <span className="text-sm">
            <span className="font-medium">{studentCount}</span>
            {expected > 0 && studentCount !== expected ? (
              <span className="text-muted-foreground"> / {expected}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={isTeachingGroup ? 'Add learners' : 'Add students'}
              title={isTeachingGroup ? 'Add learners' : 'Add students'}
              onClick={stop(() => onAddStudents(entry))}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={isTeachingGroup ? 'Edit teaching group' : 'Edit class'}
              title={isTeachingGroup ? 'Edit teaching group' : 'Edit class'}
              onClick={stop(() => onEdit(entry))}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={isTeachingGroup ? 'Delete teaching group' : 'Delete class'}
              title={isTeachingGroup ? 'Delete teaching group' : 'Delete class'}
              onClick={stop(() => onDelete(entry))}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Hide Subject column for school teachers when nothing in the list has one.
  // Standalone teachers always see it — it's their primary organising dimension.
  const hasAnySubject = entries.some((e) => Boolean(e.subject?.name));
  const visibleColumns =
    !isTeachingGroup && !hasAnySubject
      ? columns.filter((c) => c.id !== 'subject')
      : columns;

  return (
    <DataTable
      columns={visibleColumns}
      data={entries}
      onRowClick={(entry) =>
        router.push(`/teacher/classes/${resolveId(entry.class)}/roster`)
      }
      enablePagination={entries.length > 25}
    />
  );
}
