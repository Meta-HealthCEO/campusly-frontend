'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeRemainingSeconds,
  formatCountdown,
  timerUrgency,
} from '@/lib/test-timer';

interface TestCountdownProps {
  startedAt: string | null;
  durationMinutes: number;
  /** Fired once when the countdown reaches zero. */
  onExpire: () => void;
  /** Pause ticking + expiry once the test is submitted. */
  active: boolean;
}

/**
 * Live countdown for a timed digital paper. Derives remaining time from the
 * server-stamped `startedAt` (so refreshing the page can't reset the clock)
 * and fires `onExpire` exactly once when time runs out.
 */
export function TestCountdown({
  startedAt,
  durationMinutes,
  onExpire,
  active,
}: TestCountdownProps) {
  const [remaining, setRemaining] = useState<number | null>(() =>
    computeRemainingSeconds(startedAt, durationMinutes, Date.now()),
  );
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const next = computeRemainingSeconds(startedAt, durationMinutes, Date.now());
      setRemaining(next);
      if (next === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, durationMinutes, active]);

  if (remaining === null) return null;

  const urgency = timerUrgency(remaining);

  return (
    <span
      role="timer"
      aria-live={urgency === 'normal' ? 'off' : 'polite'}
      aria-label={`Time remaining: ${formatCountdown(remaining)}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-sm font-semibold tabular-nums',
        urgency === 'normal' && 'text-foreground',
        urgency === 'warning' &&
          'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        urgency === 'critical' &&
          'border-destructive/50 bg-destructive/10 text-destructive motion-safe:animate-pulse',
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {formatCountdown(remaining)}
    </span>
  );
}
