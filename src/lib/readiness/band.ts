export interface ReadinessBandInput {
  low: number;
  high: number;
  target: number;
}

export interface BandGeometry {
  /** Percent from the left of a 0–100 track. */
  left: number;
  width: number;
  targetAt: number;
  /** Points from the top of the band to the target; 0 once the band reaches it. */
  toTarget: number;
  reachesTarget: boolean;
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));

export function bandGeometry({ low, high, target }: ReadinessBandInput): BandGeometry {
  const lo = clamp(Math.min(low, high));
  const hi = clamp(Math.max(low, high));
  const t = clamp(target);
  return { left: lo, width: hi - lo, targetAt: t, toTarget: Math.max(0, t - hi), reachesTarget: hi >= t };
}

export function bandSentence(input: ReadinessBandInput): string {
  const g = bandGeometry(input);
  const band = `Heading for ${g.left}–${g.left + g.width}%.`;
  return g.reachesTarget
    ? `${band} On track for your ${g.targetAt}% target.`
    : `${band} Target ${g.targetAt}%: ${g.toTarget} points to go.`;
}
