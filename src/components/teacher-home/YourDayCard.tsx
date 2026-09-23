import Link from 'next/link';
import { CalendarClock, CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { AnnotatedPeriod, LessonLink } from '@/lib/teacher-today';

interface YourDayCardProps {
  periods: AnnotatedPeriod[];
  lessonsByClass: Map<string, LessonLink>;
  isWeekend: boolean;
  /** School teachers have a timetable page; independent teachers don't. */
  showTimetableLink: boolean;
}

const PHASE_LABEL: Partial<Record<AnnotatedPeriod['phase'], string>> = { now: 'Now', next: 'Next' };

function registerHref(period: AnnotatedPeriod): string {
  const params = new URLSearchParams({ classId: period.classId, period: String(period.period) });
  return `${ROUTES.TEACHER_ATTENDANCE}?${params.toString()}`;
}

function RegisterAction({ period }: { period: AnnotatedPeriod }) {
  if (period.recorded) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5" aria-hidden />
        Register taken
      </span>
    );
  }
  const due = period.phase === 'done' || period.phase === 'now';
  return (
    <Link
      href={registerHref(period)}
      // 44px touch target on phones (taking the register is a phone task); compact on desktop.
      className={cn(buttonVariants({ variant: due ? 'default' : 'outline' }), 'h-11 shrink-0 sm:h-8')}
    >
      Take register
    </Link>
  );
}

function PeriodRow({ period, lesson }: { period: AnnotatedPeriod; lesson?: LessonLink }) {
  const phaseLabel = PHASE_LABEL[period.phase];
  return (
    <li
      className={cn(
        'flex flex-col gap-2 border-l-2 py-3 pl-3 sm:flex-row sm:items-center sm:gap-4',
        period.phase === 'now' ? 'border-l-primary bg-primary/5' : 'border-l-transparent',
        period.phase === 'done' && period.recorded && 'opacity-70',
      )}
    >
      <div className="w-28 shrink-0">
        <p className="text-sm font-medium tabular-nums">{period.startTime}–{period.endTime}</p>
        <p className="text-xs text-muted-foreground">
          Period {period.period}
          {phaseLabel ? <span className="ml-1.5 font-medium text-primary">· {phaseLabel}</span> : null}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {period.className}
          <span className="font-normal text-muted-foreground"> · {period.subjectName}</span>
          {period.room ? <span className="font-normal text-muted-foreground"> · {period.room}</span> : null}
        </p>
        {lesson ? (
          <Link
            href={`${ROUTES.TEACHER_LESSONS}/${lesson.lessonId}`}
            className="block truncate text-xs text-primary hover:underline"
          >
            Lesson: {lesson.title}
          </Link>
        ) : (
          <Link
            href={`${ROUTES.TEACHER_LESSONS}/new`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="size-3" aria-hidden />
            Plan a lesson with AI
          </Link>
        )}
      </div>
      <RegisterAction period={period} />
    </li>
  );
}

/** Today's timetable as a timeline, with the register and lesson for each period. */
export function YourDayCard({ periods, lessonsByClass, isWeekend, showTimetableLink }: YourDayCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-medium">Your day</CardTitle>
        {showTimetableLink ? (
          <Link href={ROUTES.TEACHER_TIMETABLE} className="text-xs text-muted-foreground hover:text-foreground">
            Full timetable
          </Link>
        ) : null}
      </CardHeader>
      <CardContent>
        {periods.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CalendarClock className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {isWeekend ? "It's the weekend — no periods today." : 'No periods on your timetable today.'}
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-border/40">
            {periods.map((period: AnnotatedPeriod) => (
              <PeriodRow
                key={period.timetableId}
                period={period}
                lesson={lessonsByClass.get(period.classId)}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
