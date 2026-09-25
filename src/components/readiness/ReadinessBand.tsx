import { bandGeometry, bandSentence } from '@/lib/readiness/band';

interface ReadinessBandProps {
  low: number;
  high: number;
  target: number;
}

/** Spec §4: the predicted band against the target on a 0–100 track. */
export function ReadinessBand({ low, high, target }: ReadinessBandProps) {
  const g = bandGeometry({ low, high, target });
  const sentence = bandSentence({ low, high, target });
  return (
    <div className="space-y-2">
      <div role="img" aria-label={sentence} className="relative h-3 rounded-full bg-muted">
        <span className="absolute inset-y-0 rounded-full bg-primary" style={{ left: `${g.left}%`, width: `${Math.max(g.width, 1)}%` }} />
        <span className="absolute -inset-y-1 w-0.5 rounded-full bg-secure-strong" style={{ left: `${g.targetAt}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">{sentence}</p>
    </div>
  );
}
