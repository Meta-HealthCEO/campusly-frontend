/** One Recharts theme from the Blueprint tokens (spec §4). Recharts needs literal colours, so they are read at runtime. */
export interface ChartTheme {
  series: readonly string[];
  grid: string;
  axis: string;
  text: string;
  target: string;
  surface: string;
  border: string;
  fontFamily: string;
}

export type TokenReader = (token: string) => string;

export const CHART_SERIES_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const;

export function chartTheme(read: TokenReader): ChartTheme {
  const get = (token: string): string => {
    const value = read(token).trim();
    if (!value) throw new Error(`Chart token --${token} is not defined`);
    return value;
  };
  return {
    series: CHART_SERIES_TOKENS.map(get),
    grid: get('border'),
    axis: get('muted-foreground'),
    text: get('foreground'),
    target: get('secure-strong'),
    surface: get('popover'),
    border: get('border'),
    fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
  };
}

export function seriesColour(theme: ChartTheme, index: number): string {
  const n = theme.series.length;
  return theme.series[((index % n) + n) % n];
}

/** A percent axis rounded out to tens around the values and the target, within 0–100. */
export function trendDomain(values: readonly number[], target?: number): [number, number] {
  const all = [...values, ...(target === undefined ? [] : [target])].filter((v: number) => Number.isFinite(v));
  if (all.length === 0) return [0, 100];
  const lo = Math.max(0, Math.floor((Math.min(...all) - 5) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...all) + 5) / 10) * 10);
  return lo === hi ? [Math.max(0, lo - 10), Math.min(100, hi + 10)] : [lo, hi];
}
