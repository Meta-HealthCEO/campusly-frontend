import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig, { LEGACY_TEACHER_REDIRECTS } from '../next.config';

const APP = path.resolve(__dirname, '../src/app/(dashboard)');
/** '/teacher/papers/:id' → src/app/(dashboard)/teacher/papers/[id]/page.tsx */
const pageFor = (route: string): string =>
  path.join(
    APP,
    ...route.split('/').filter(Boolean).map((seg: string) => (seg.startsWith(':') ? `[${seg.slice(1)}]` : seg)),
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

  it('is exactly what Next serves', async () => {
    expect(LEGACY_TEACHER_REDIRECTS.length).toBeGreaterThan(0);
    expect(await nextConfig.redirects?.()).toEqual(LEGACY_TEACHER_REDIRECTS);
  });
});
