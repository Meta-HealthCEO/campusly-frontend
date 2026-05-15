'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, User } from 'lucide-react';
import type { StudentClass } from '@/hooks/useStudentClasses';

interface ClassCardProps {
  cls: StudentClass;
  variant?: 'homeroom' | 'subject';
}

export function ClassCard({ cls, variant = 'subject' }: ClassCardProps) {
  const isHomeroom = variant === 'homeroom';

  return (
    <Card
      className={
        isHomeroom
          ? 'border-primary/30 bg-primary/5'
          : undefined
      }
    >
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold truncate">{cls.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{cls.grade.name}</p>
          </div>
          {isHomeroom && (
            <Badge variant="secondary" className="shrink-0">
              Homeroom
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {cls.teacher.firstName} {cls.teacher.lastName}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <GraduationCap className="h-3.5 w-3.5" />
            Class code
          </span>
          <span className="font-mono text-sm tracking-wider">
            {cls.classroomCode}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
