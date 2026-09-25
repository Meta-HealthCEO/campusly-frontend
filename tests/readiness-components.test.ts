import { describe, expect, it } from 'vitest';
import { listSourceFiles, readSource } from './support/source';
import { findColourLiterals } from '../src/lib/design/palette-scan';

const files = ['ExamMap.tsx', 'Countdown.tsx', 'NextUp.tsx', 'MarksToGain.tsx', 'ReadinessBand.tsx', 'TrendChart.tsx'];
const read = (f: string) => readSource(`src/components/readiness/${f}`);

describe('readiness components', () => {
  it('all exist and are exported together', () => {
    expect(listSourceFiles('src/components/readiness').map((f: string) => f.split('/').pop())).toEqual(expect.arrayContaining([...files, 'index.ts']));
    for (const f of files) expect(read('index.ts')).toContain(`./${f.replace('.tsx', '')}`);
  });

  it.each(files)('%s never re-types the mastery thresholds (spec §2.1)', (f) => {
    expect(read(f)).not.toMatch(/[<>]=?\s*(60|70)\b/);
  });

  it.each(files)('%s has no colour literals: colours come from tokens (spec §4)', (f) => {
    expect(findColourLiterals(read(f))).toEqual([]);
  });

  it.each(files)('%s stays under 300 lines (spec §7)', (f) => {
    expect(read(f).split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('the exam map has an accessible name and a list fallback', () => {
    const src = read('ExamMap.tsx');
    expect(src).toMatch(/role="img"/);
    expect(src).toMatch(/aria-label=\{examMapLabel\(/);
    expect(src).toMatch(/className="sr-only"/);
    expect(src).toMatch(/layoutExamMap\(/);
  });

  it('the exam map value line wraps instead of clipping (orchestrator ruling O2)', () => {
    const src = read('ExamMap.tsx');
    expect(src).not.toMatch(/\btruncate\b|text-ellipsis/);
    // Percentage and marks are separate pieces: side by side in a wide tile, stacked in a narrow one.
    expect(src).toMatch(/@container/);
    expect(src).toMatch(/>\{tile\.marks\} marks</);
  });

  it('colour lives in solid marks: tiles, legend dots and bars; the untested tile has no fill (ruling O1 revised 2)', () => {
    const map = read('ExamMap.tsx');
    expect(map).toMatch(/untested: 'border border-dashed border-border bg-card text-muted-foreground'/);
    for (const level of ['secure', 'building', 'weak']) {
      expect(map).toMatch(new RegExp(`${level}: 'bg-tile-${level} text-tile-${level}-ink'`));
      expect(map).toMatch(new RegExp(`${level}: 'before:bg-mark-${level}'`));
    }
  });

  it('tile text is WCAG large text: 19px bold for the topic name and the value line (ruling O1 final)', () => {
    const map = read('ExamMap.tsx');
    const tileText = /const TILE_TEXT = '([^']+)'/.exec(map)?.[1] ?? '';
    const px = Number(/text-\[(\d+)px\]/.exec(tileText)?.[1] ?? 0);
    expect(px).toBeGreaterThanOrEqual(19);
    expect(tileText.split(' ')).toEqual(expect.arrayContaining(['font-bold', 'leading-[1.2]']));
    // Both the name and the value line use it.
    expect(map.match(/cn\([^)]*TILE_TEXT/g) ?? []).toHaveLength(2);
  });

  it('the map grows on narrow screens instead of clipping 19px text (ruling O1 final)', () => {
    const map = read('ExamMap.tsx');
    expect(map).toMatch(/min-h-64/);
    expect(map).not.toMatch(/(?<![\w-])h-(64|72)\b|line-clamp/);
    expect(map).toMatch(/flex-wrap/);
    expect(read('MarksToGain.tsx')).toMatch(/secure: 'bg-mark-secure', building: 'bg-mark-building', weak: 'bg-mark-weak'/);
  });

  it('NextUp is a plain card: its one emphasis is the filled button (ruling O1 revised)', () => {
    const src = read('NextUp.tsx');
    expect(src).toMatch(/<Card>/);
    expect(src).not.toMatch(/bg-accent|border-primary|text-accent-foreground/);
  });

  it('the trend chart takes its colours from the chart theme', () => {
    const src = read('TrendChart.tsx');
    expect(src).toMatch(/useChartTheme\(\)/);
    expect(src).toMatch(/trendDomain\(/);
    expect(src).toMatch(/strokeDasharray="4 4"/);
  });

  it('NextUp carries the one filled button', () => {
    expect(read('NextUp.tsx')).toMatch(/buttonVariants\(\{ size: 'lg' \}\)/);
  });
});
