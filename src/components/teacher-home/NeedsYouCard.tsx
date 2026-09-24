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
  const clear = count === 0;
  return (
    <li>
      <Link
        href={href}
        className="grid min-h-11 grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-1 py-3 transition-colors hover:bg-muted/60"
      >
        <Icon className={cn('size-4', clear ? 'text-muted-foreground/60' : 'text-muted-foreground')} aria-hidden />
        <span className="min-w-0">
          <span className={cn('block truncate text-sm', clear ? 'text-muted-foreground' : 'font-medium')}>{label}</span>
          {detail && !clear ? (
            <span className={cn('block truncate text-xs', urgent ? 'text-attention' : 'text-muted-foreground')}>{detail}</span>
          ) : null}
        </span>
        {clear ? (
          <span className="text-[13px] font-medium text-success">All clear</span>
        ) : (
          <span className="font-mono text-xl font-medium tabular-nums">{count}</span>
        )}
      </Link>
    </li>
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
      <CardHeader className="pb-1">
        <CardTitle className="font-heading text-[17px] font-semibold tracking-tight">Needs you</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-muted">
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
        </ul>
        {marking.available ? (
          <Link
            href={ROUTES.TEACHER_CURRICULUM_MARK_PAPERS}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-accent-foreground hover:bg-accent sm:min-h-9"
          >
            <Sparkles className="size-4" aria-hidden />
            Mark handwritten scripts with AI
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
