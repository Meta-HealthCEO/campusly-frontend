import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig, { LEGACY_TEACHER_REDIRECTS } from '../next.config';

const APP = path.resolve(__dirname, '../src/app/(dashboard)');
/** '/teacher/papers/:id' → src/app/(dashboard)/teacher/papers/[id]/page.tsx */
const pageFor = (route: string): string =>
  path.join(
    APP,
    ...route.split('?')[0].split('/').filter(Boolean).map((seg: string) => (seg.startsWith(':') ? `[${seg.slice(1)}]` : seg)),
    'page.tsx',
  );

describe('legacy teacher redirects', () => {
  it('removes the old page behind every redirected URL', () => {
    const leftovers = LEGACY_TEACHER_REDIRECTS.map((r) => r.source).filter((s: string) => existsSync(pageFor(s)));
    expect(leftovers).toEqual([]);
  });

  it('only sends people to pages that exist', () => {
    const missing = LEGACY_TEACHER_REDIRECTS.map((r) => r.destination).filter((d: string) => !existsSync(pageFor(d)));
    expect(missing).toEqual([]);
  });

  it('sends old reports, report comments and assessment structures into the gradebook', () => {
    const to = (source: string) => LEGACY_TEACHER_REDIRECTS.find((r) => r.source === source)?.destination;
    expect(to('/teacher/reports')).toBe('/teacher/grades?tab=reports');
    expect(to('/teacher/ai-tools/report-comments')).toBe('/teacher/grades?tab=reports');
    expect(to('/teacher/curriculum/assessment-structure')).toBe('/teacher/grades?tab=weightings');
    expect(to('/teacher/curriculum/assessment-structure/:id')).toBe('/teacher/grades?tab=weightings');
  });

  it('sends the old moderation page to the papers list, filtered to papers with the HOD', () => {
    expect(LEGACY_TEACHER_REDIRECTS.find((r) => r.source === '/teacher/workbench/papers/moderation')?.destination)
      .toBe('/teacher/papers?moderation=pending');
  });

  it('is exactly what Next serves', async () => {
    expect(LEGACY_TEACHER_REDIRECTS.length).toBeGreaterThan(0);
    expect(await nextConfig.redirects?.()).toEqual(LEGACY_TEACHER_REDIRECTS);
  });
});

describe('one behaviour log', () => {
  it('sends the old Discipline and Merits pages to Behaviour', () => {
    const to = (source: string) => LEGACY_TEACHER_REDIRECTS.find((r) => r.source === source)?.destination;
    expect(to('/teacher/discipline')).toBe('/teacher/behaviour');
    expect(to('/teacher/merits')).toBe('/teacher/behaviour');
  });
});
