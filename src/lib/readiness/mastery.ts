export type MasteryLevel = 'secure' | 'building' | 'weak';

/** Spec §2.1: secure ≥ 70%, building 60–69%, weak < 60%. The only place these numbers live. */
export const MASTERY_THRESHOLDS = { secure: 70, building: 60 } as const;

export const MASTERY_LABEL: Record<MasteryLevel, string> = { secure: 'Secure', building: 'Building', weak: 'Weak' };

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

export function masteryLevel(pct: number): MasteryLevel {
  if (Number.isNaN(pct)) throw new RangeError('masteryLevel needs a number: pass mastery only once it is known (null means untested)');
  const p = clampPct(pct);
  if (p >= MASTERY_THRESHOLDS.secure) return 'secure';
  if (p >= MASTERY_THRESHOLDS.building) return 'building';
  return 'weak';
}

/** Marks a learner gains by securing the topic: marks × (100 − mastery)%, to one decimal. */
export function marksToGain(marks: number, masteryPct: number): number {
  const m = Math.max(0, marks);
  return Math.round((m * (100 - clampPct(masteryPct))) / 10) / 10;
}
