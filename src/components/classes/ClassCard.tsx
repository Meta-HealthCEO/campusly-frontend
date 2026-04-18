'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';

interface ClassCardProps {
  entry: TeacherClassEntry;
  entryKey: string;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClassCard({ entry, entryKey: key, onClick, onEdit, onDelete }: ClassCardProps) {
  const cls = entry.class;
  const studentCount = entry.students?.length ?? 0;
  const capacity = cls.capacity ?? 30;
  const pct = Math.round((studentCount / capacity) * 100);

  return (
    <Card
      key={key}
      className="cursor-pointer transition-colors hover:bg-muted/50 relative group"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold truncate">
                {cls.grade?.name ?? cls.gradeName ?? ''} {cls.name}
              </h3>
              {entry.isHomeroom ? (
                <Badge variant="default">Homeroom</Badge>
              ) : entry.subject ? (
                <Badge variant="secondary">{entry.subject.name}</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {cls.grade?.name ?? cls.gradeName ?? ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Edit class"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Delete class"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Students</span>
            <span className="font-medium">{studentCount} / {capacity}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pct > 90 ? 'bg-destructive' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500',
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
        <Badge variant="secondary">{pct}% capacity</Badge>
      </CardContent>
    </Card>
  );
}
