// ============================================================
// Test Timer — pure countdown logic for timed digital papers
// ============================================================
//
// The backend stamps `startedAt` when a submission is created; the paper
// carries `duration` in minutes. These helpers derive the remaining time so
// the take-test UI can show a countdown and auto-submit at zero.

export type TimerUrgency = 'normal' | 'warning' | 'critical';

const WARNING_THRESHOLD_SECONDS = 5 * 60;
const CRITICAL_THRESHOLD_SECONDS = 60;

/**
 * Seconds left on a timed submission, clamped at 0.
 * Returns `null` when the paper is effectively untimed: no/invalid
 * `startedAt`, or a non-positive duration.
 */
export function computeRemainingSeconds(
  startedAt: string | null | undefined,
  durationMinutes: number,
  nowMs: number,
): number | null {
  if (!startedAt || durationMinutes <= 0) return null;
  const startMs = Date.parse(startedAt);
  if (Number.isNaN(startMs)) return null;
  const endMs = startMs + durationMinutes * 60_000;
  return Math.max(0, Math.floor((endMs - nowMs) / 1000));
}

/** Format seconds as `h:mm:ss` above an hour, `m:ss` below. Never negative. */
export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/** Visual urgency band: <1 min critical, <5 min warning, else normal. */
export function timerUrgency(remainingSeconds: number): TimerUrgency {
  if (remainingSeconds < CRITICAL_THRESHOLD_SECONDS) return 'critical';
  if (remainingSeconds < WARNING_THRESHOLD_SECONDS) return 'warning';
  return 'normal';
}
