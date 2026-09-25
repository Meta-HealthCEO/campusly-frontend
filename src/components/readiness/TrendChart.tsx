'use client';

import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useChartTheme } from '@/hooks/useChartTheme';
import { trendDomain } from '@/lib/charts/chart-theme';

interface TrendChartProps {
  points: ReadonlyArray<{ label: string; value: number }>;
  target?: number;
  /** Accessible summary, e.g. "Predicted Paper 1 mark over six weeks, from 48% to 61%; target 75%". */
  label: string;
}

/** Spec §4: Recharts line on tokens: faint grid, dashed target line, emphasised last point. */
export function TrendChart({ points, target, label }: TrendChartProps) {
  const theme = useChartTheme();
  if (points.length === 0) return <p className="text-sm text-muted-foreground">No results yet. The trend starts after the first test.</p>;
  if (!theme) return <Skeleton className="h-44 w-full" />;
  const [lo, hi] = trendDomain(points.map((p) => p.value), target);
  const last = points[points.length - 1];
  const tick = { fill: theme.axis, fontSize: 11, fontFamily: theme.fontFamily };
  return (
    <figure role="img" aria-label={label} className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...points]} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} />
          <YAxis domain={[lo, hi]} tickCount={3} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} tick={tick} width={40} />
          {target !== undefined && (
            <ReferenceLine y={target} stroke={theme.target} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `Target ${target}%`, position: 'insideTopRight', fill: theme.target, fontSize: 11 }} />
          )}
          <Line type="monotone" dataKey="value" stroke={theme.series[0]} strokeWidth={2.25} dot={false} activeDot={false} isAnimationActive={false} />
          <ReferenceDot x={last.label} y={last.value} r={4.5} fill={theme.series[0]} stroke="none" />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
