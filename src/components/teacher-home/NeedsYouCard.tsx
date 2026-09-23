import Link from 'next/link';
import { ClipboardCheck, ClipboardList, MessageSquare, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { TodayMarking } from '@/hooks/useTeacherToday';

interface NeedsYouCardProps {
  marking: TodayMarking;
  /** Fallback count from the homework grading summary when the hub is off. */
  gradingFallback: number;
  homeworkDueToday: number;
  /** Null hides the row (independent teachers have no parent messaging). */
  unreadMessages: number | null;
}

interface RowProps {
  icon: LucideIcon;
  label: string;
  detail?: string;
  count: number;
  href: string;
  urgent?: boolean;
}

function Row({ icon: Icon, label, detail, count, href, urgent }: RowProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-l-2 border-l-transparent p-3 transition-colors duration-100 ease-out hover:border-l-foreground/20 hover:bg-muted/40"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {detail ? (
          <p className={cn('truncate text-xs', urgent ? 'text-destructive' : 'text-muted-foreground')}>{detail}</p>
        ) : null}
      </div>
      <span
        className={cn(
          'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-medium tabular-nums',
          count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </Link>
  );
}

/** What's waiting on the teacher right now, each with a one-click way in. */
export function NeedsYouCard({ marking, gradingFallback, homeworkDueToday, unreadMessages }: NeedsYouCardProps) {
  const toMark = marking.available ? marking.pending : gradingFallback;
  const markingDetail = marking.overdue > 0
    ? `${marking.overdue} overdue`
    : marking.dueToday > 0 ? `${marking.dueToday} due today` : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Needs you</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="divide-y divide-border/40">
          <Row
            icon={ClipboardCheck}
            label="Submissions to mark"
            detail={markingDetail}
            urgent={marking.overdue > 0}
            count={toMark}
            href={marking.available ? ROUTES.TEACHER_WORKBENCH_MARKING_HUB : ROUTES.TEACHER_HOMEWORK}
          />
          <Row
            icon={ClipboardList}
            label="Homework due today"
            count={homeworkDueToday}
            href={ROUTES.TEACHER_HOMEWORK}
          />
          {unreadMessages !== null ? (
            <Row
              icon={MessageSquare}
              label="Unread messages"
              count={unreadMessages}
              href={ROUTES.TEACHER_MESSAGES}
            />
          ) : null}
        </div>
        {marking.available ? (
          <Link
            href={ROUTES.TEACHER_CURRICULUM_MARK_PAPERS}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            <Sparkles className="size-4" aria-hidden />
            Mark handwritten scripts with AI
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
