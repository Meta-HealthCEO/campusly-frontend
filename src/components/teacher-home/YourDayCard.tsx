import { Fragment } from 'react';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { StatusChip } from '@/components/shared/StatusChip';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { nowLinePlacement, type AnnotatedPeriod, type LessonLink } from '@/lib/teacher-today';

interface YourDayCardProps {
  periods: AnnotatedPeriod[];
  lessonsByClass: Map<string, LessonLink>;
  isWeekend: boolean;
  /** School teachers have a timetable page; independent teachers don't. */
  showTimetableLink: boolean;
  /** The clock the day is drawn against (the page re-renders it every minute). */
  now: Date;
}

export function registerHref(period: AnnotatedPeriod): string {
  const params = new URLSearchParams({ classId: period.classId, period: String(period.period) });
  return `${ROUTES.TEACHER_ATTENDANCE}?${params.toString()}`;
}

function Rail({ phase }: { phase: AnnotatedPeriod['phase'] }) {
  return (
    <span
      aria-hidden
      className={cn(
        'h-2.5 w-2.5 justify-self-center rounded-full',
        phase === 'done' && 'bg-border',
        (phase === 'now' || phase === 'next') && 'bg-primary ring-4 ring-accent-soft',
        phase === 'later' && 'border-2 border-border bg-card',
      )}
    />
  );
}

function PeriodAction({ period }: { period: AnnotatedPeriod }) {
  if (period.recorded) return <StatusChip status="done" label="Taken" />;
  const due = period.phase === 'done' || period.phase === 'now';
  if (due || period.period === 1) {
    return (
      <Link
        href={registerHref(period)}
        className={cn(buttonVariants({ variant: due ? 'default' : 'outline', size: 'sm' }), 'h-11 shrink-0 sm:h-8')}
      >
        Take register
      </Link>
    );
  }
  return null;
}

function PeriodRow({ period, lesson }: { period: AnnotatedPeriod; lesson?: LessonLink }) {
  const past = period.phase === 'done';
  return (
    <li className="grid grid-cols-[52px_18px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 border-t border-muted py-3 first:border-t-0 sm:grid-cols-[52px_18px_minmax(0,1fr)_auto]">
      <span className={cn('font-mono text-[13px] tabular-nums text-muted-foreground', past && 'opacity-60')}>{period.startTime}</span>
      <Rail phase={period.phase} />
      <div className={cn('min-w-0', past && 'opacity-60')}>
        <p className="truncate text-sm">
          <span className="font-semibold">{period.subjectName}</span>
          <span className="text-muted-foreground"> · {period.className}{period.room ? ` · ${period.room}` : ''}</span>
        </p>
        {lesson ? (
          <Link href={`${ROUTES.TEACHER_LESSONS}/${lesson.lessonId}`} className="block truncate text-[12.5px] text-accent hover:underline">
            {lesson.title}
          </Link>
        ) : (
          <Link href={`${ROUTES.TEACHER_LESSONS}/new`} className="text-[12.5px] text-muted-foreground hover:text-foreground">
            No lesson yet · <span className="text-accent">Make one</span>
          </Link>
        )}
      </div>
      <div className="col-start-3 sm:col-start-auto sm:justify-self-end">
        <PeriodAction period={period} />
      </div>
    </li>
  );
}

function NowLine({ label }: { label: string }) {
  return (
    <li aria-label={`Now, ${label}`} className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2.5 py-1">
      <span className="justify-self-start rounded bg-primary px-1.5 py-px font-mono text-[11.5px] font-medium tabular-nums text-primary-foreground">
        {label}
      </span>
      <span aria-hidden className="h-[1.5px] bg-gradient-to-r from-primary to-primary/15" />
    </li>
  );
}

/** Today's timetable as a timeline, with the register and lesson for each period and a live "now" line. */
export function YourDayCard({ periods, lessonsByClass, isWeekend, showTimetableLink, now }: YourDayCardProps) {
  const line = nowLinePlacement(periods, now);
  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between gap-2 pb-2">
        <CardTitle className="font-heading text-[17px] font-semibold tracking-tight">Your day</CardTitle>
        {showTimetableLink ? (
          <Link href={ROUTES.TEACHER_TIMETABLE} className="text-[13px] font-medium text-accent hover:underline">
            Timetable →
          </Link>
        ) : null}
      </CardHeader>
      <CardContent>
        {periods.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CalendarClock className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {isWeekend ? "It's the weekend. No periods today." : 'No periods on your timetable today.'}
            </p>
          </div>
        ) : (
          <ol>
            {periods.map((period: AnnotatedPeriod, i: number) => (
              <Fragment key={period.timetableId}>
                {line && line.index === i ? <NowLine label={line.label} /> : null}
                <PeriodRow period={period} lesson={lessonsByClass.get(period.classId)} />
              </Fragment>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
