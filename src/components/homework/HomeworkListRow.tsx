'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ClipboardList, BookOpen, Target } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Homework } from '@/types/homework';

interface Props {
  homework: Homework;
}

const TYPE_ICON = {
  quiz: ClipboardList,
  reading: BookOpen,
  exercise: Target,
} as const;

const TYPE_LABEL = {
  quiz: 'Quiz',
  reading: 'Reading',
  exercise: 'Exercise',
} as const;

export function HomeworkListRow({ homework }: Props) {
  const Icon = TYPE_ICON[homework.type];
  const isOverdue =
    new Date(homework.dueDate) < new Date() && homework.status === 'assigned';

  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{homework.title}</p>
              <Badge variant="outline" className="capitalize shrink-0">
                {TYPE_LABEL[homework.type]}
              </Badge>
              {homework.latePolicy === 'block' && (
                <Badge variant="secondary" className="shrink-0">
                  Block late
                </Badge>
              )}
              {homework.latePolicy === 'penalty' && (
                <Badge variant="secondary" className="shrink-0">
                  {homework.latePenaltyPercent ?? 0}% late penalty
                </Badge>
              )}
              {homework.latePolicy === 'accept' && (
                <Badge variant="outline" className="shrink-0">
                  Accept late
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due {formatDate(homework.dueDate)}
              </span>
              {isOverdue && (
                <span className="text-destructive font-medium">Overdue</span>
              )}
              <Badge
                variant={homework.status === 'assigned' ? 'default' : 'outline'}
                className="capitalize"
              >
                {homework.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex shrink-0">
          <Link href={`/teacher/homework/${homework._id}`}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
