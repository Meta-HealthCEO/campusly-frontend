'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Trash2, Pencil, Home, UserPlus } from 'lucide-react';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';

interface ClassCardProps {
  entry: TeacherClassEntry;
  entryKey: string;
  copyMode?: 'class' | 'teachingGroup';
  onClick: () => void;
  onAddStudents: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function readGradeName(entry: TeacherClassEntry): string {
  // Backend may populate gradeId as { _id, name, level } even though the static
  // type says string — handle both shapes defensively.
  const g = entry.class.gradeId as unknown;
  if (g && typeof g === 'object' && g !== null) {
    const obj = g as Record<string, unknown>;
    if (typeof obj.name === 'string') return obj.name;
  }
  return entry.class.grade?.name ?? entry.class.gradeName ?? '';
}

export function ClassCard({ entry, entryKey: key, copyMode = 'class', onClick, onAddStudents, onEdit, onDelete }: ClassCardProps) {
  const cls = entry.class;
  const studentCount = entry.students?.length ?? 0;
  const expected = cls.capacity ?? 0;
  const isTeachingGroup = copyMode === 'teachingGroup';
  const learnerNoun = isTeachingGroup
    ? (studentCount === 1 ? 'learner' : 'learners')
    : (studentCount === 1 ? 'student' : 'students');

  const gradeName = readGradeName(entry);
  const subjectName = entry.subject?.name;

  return (
    <Card
      key={key}
      className="cursor-pointer transition-colors hover:bg-muted/50 relative group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: title + actions */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight line-clamp-2 min-w-0 flex-1">
            {cls.name}
          </h3>
          <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={isTeachingGroup ? 'Add learners' : 'Add students'}
              title={isTeachingGroup ? 'Add learners' : 'Add students'}
              onClick={(e) => { e.stopPropagation(); onAddStudents(); }}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={isTeachingGroup ? 'Edit teaching group' : 'Edit class'}
              title={isTeachingGroup ? 'Edit teaching group' : 'Edit class'}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={isTeachingGroup ? 'Delete teaching group' : 'Delete class'}
              title={isTeachingGroup ? 'Delete teaching group' : 'Delete class'}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Classifier badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {gradeName && <Badge variant="outline">{gradeName}</Badge>}
          {subjectName && <Badge variant="secondary">{subjectName}</Badge>}
          {entry.isHomeroom && (
            <Badge variant="default" className="gap-1">
              <Home className="h-3 w-3" />
              Homeroom
            </Badge>
          )}
        </div>

        {/* Learner count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
          <Users className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium text-foreground">{studentCount}</span>
            {expected > 0 && studentCount !== expected && (
              <> of <span className="text-foreground">{expected}</span> expected</>
            )}{' '}
            {learnerNoun}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
