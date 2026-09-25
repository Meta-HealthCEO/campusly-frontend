import { describe, expect, it } from 'vitest';
import { listSourceFiles, readSource } from './support/source';
import { findColourLiterals } from './support/colour-literals';

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
