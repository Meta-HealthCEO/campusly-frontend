'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { chartTheme, type ChartTheme } from '@/lib/charts/chart-theme';

const readFromDocument = (token: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(`--${token}`);

/**
 * The chart theme from the live tokens, recomputed when light/dark changes. Read one frame later,
 * because next-themes swaps the `dark` class in its own effect, which runs after this child's.
 * Null until mounted: the server has no computed styles.
 */
export function useChartTheme(): ChartTheme | null {
  const { resolvedTheme } = useTheme();
  const [theme, setTheme] = useState<ChartTheme | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(chartTheme(readFromDocument)));
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme]);

  return theme;
}
