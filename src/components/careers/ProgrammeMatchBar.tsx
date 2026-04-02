'use client';

interface ProgrammeMatchBarProps {
  apsRequired: number;
  apsActual: number;
  maxAPS?: number;
}

export function ProgrammeMatchBar({
  apsRequired,
  apsActual,
  maxAPS = 42,
}: ProgrammeMatchBarProps) {
  const actualPct = Math.min((apsActual / maxAPS) * 100, 100);
  const requiredPct = Math.min((apsRequired / maxAPS) * 100, 100);
  const met = apsActual >= apsRequired;
  const close = !met && apsRequired - apsActual <= 3;

  const barColor = met
    ? 'bg-emerald-500'
    : close
      ? 'bg-amber-500'
      : 'bg-destructive';

  const textColor = met
    ? 'text-emerald-700 dark:text-emerald-400'
    : close
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-destructive';

  return (
    <div className="w-full space-y-1">
      {/* Bar */}
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        {/* Actual APS fill */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${actualPct}%` }}
        />
        {/* Required marker */}
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/70"
          style={{ left: `${requiredPct}%` }}
          aria-label={`Required APS: ${apsRequired}`}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${textColor}`}>
          Your APS: {apsActual}
        </span>
        <span className="text-muted-foreground">
          Required: {apsRequired}
        </span>
      </div>
    </div>
  );
}
