import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { chartTheme, seriesColour, trendDomain } from '../src/lib/charts/chart-theme';
import { readTokenBlock } from '../src/lib/design/token-pairs';

const css = readFileSync(path.resolve(__dirname, '../src/app/globals.css'), 'utf8');
const light = readTokenBlock(css, ':root');
const dark = { ...light, ...readTokenBlock(css, '.dark') };
const reader = (tokens: Record<string, string>) => (token: string) => tokens[token] ?? '';

describe('chartTheme', () => {
  it('takes every colour from the tokens (spec §4: no chart sets its own colours)', () => {
    const theme = chartTheme(reader(light));
    expect(theme.series).toEqual([light['chart-1'], light['chart-2'], light['chart-3'], light['chart-4'], light['chart-5']]);
    expect(theme).toMatchObject({ grid: light.border, axis: light['muted-foreground'], text: light.foreground, target: light['secure-strong'], surface: light.popover });
  });

  it('follows the theme: the dark tokens give the dark colours', () => {
    expect(chartTheme(reader(dark)).series[0]).toBe('#6B95FF');
    expect(chartTheme(reader(light)).series[0]).toBe('#1554F0');
  });

  it('trims the spaces getComputedStyle leaves', () => {
    expect(chartTheme(reader({ ...light, 'chart-1': ' #1554F0 ' })).series[0]).toBe('#1554F0');
  });

  it('fails loudly when a token is missing rather than drawing black', () => {
    expect(() => chartTheme(reader({}))).toThrow(/--chart-1/);
  });

  it('wraps series colours when a chart has more series than tokens', () => {
    const theme = chartTheme(reader(light));
    expect(seriesColour(theme, 5)).toBe(theme.series[0]);
    expect(seriesColour(theme, -1)).toBe(theme.series[4]);
  });
});

describe('trendDomain', () => {
  it('rounds out to tens around the values and the target (the mockup: 40–80)', () => {
    expect(trendDomain([48, 51, 53, 55, 58, 61], 75)).toEqual([40, 80]);
  });

  it('stays within 0–100', () => {
    expect(trendDomain([2, 99])).toEqual([0, 100]);
  });

  it('gives a flat line some room', () => {
    expect(trendDomain([50, 50])).toEqual([40, 60]);
  });

  it('falls back to 0–100 with no usable values', () => {
    expect(trendDomain([])).toEqual([0, 100]);
    expect(trendDomain([Number.NaN])).toEqual([0, 100]);
  });
});
