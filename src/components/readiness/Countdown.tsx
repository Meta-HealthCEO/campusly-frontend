import { countdownText, daysUntil, formatExamDate } from '@/lib/readiness/countdown';

interface CountdownProps {
  paper: string;
  examDate: Date;
  /** Passed in, so server and client render the same day. */
  now: Date;
}

/** Spec §1: the countdown to the exam; the screen's one display-size figure. */
export function Countdown({ paper, examDate, now }: CountdownProps) {
  const days = daysUntil(examDate, now);
  const text = countdownText(paper, examDate, now);
  if (days <= 0) return <p className="font-heading text-h2 font-semibold">{text}</p>;
  return (
    <p>
      {/* The big figure and its line read as one sentence to a screen reader. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-heading text-display font-bold tabular-nums tracking-[-0.025em]">{days}</span>
        <span className="text-muted-foreground">
          {days === 1 ? 'day' : 'days'} to <b className="font-semibold text-foreground">{paper}</b> · {formatExamDate(examDate)}
        </span>
      </span>
    </p>
  );
}
