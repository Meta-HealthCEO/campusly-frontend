'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StudentHomeworkItem } from '@/hooks/useStudentHomework';

interface Props {
  title: string;
  items: StudentHomeworkItem[];
  defaultOpen?: boolean;
  variant?: 'default' | 'destructive';
  empty?: ReactNode;
}

export function HomeworkSection({
  title,
  items,
  defaultOpen = true,
  variant = 'default',
  empty,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0 && !empty) return null;

  const headerClass = [
    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold',
    variant === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-muted',
  ].join(' ');

  return (
    <section className="space-y-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className={headerClass}>
        <span>
          {title} ({items.length})
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {open && (
        <div className="space-y-2">
          {items.length === 0
            ? empty
            : items.map((hw) => (
                <Link key={hw.id} href={`/student/homework/${hw.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{hw.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{hw.subject}</span>
                          {hw.sourceLesson && (
                            <span>From: {hw.sourceLesson.title}</span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due {new Date(hw.dueAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={hw.status === 'graded' ? 'default' : 'outline'}
                        className="shrink-0 capitalize"
                      >
                        {hw.status === 'graded' && hw.mark != null
                          ? `${hw.mark}/${hw.totalMarks ?? '?'}`
                          : hw.status}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>
      )}
    </section>
  );
}
