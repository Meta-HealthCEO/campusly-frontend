import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGACY_TEACHER_REDIRECTS } from '../next.config';

const SRC = path.resolve(__dirname, '../src');
const APP = path.join(SRC, 'app');

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** Every page (and route handler) as URL segments, route groups dropped: ['teacher', 'papers', '[id]']. */
const ROUTES: string[][] = files(APP)
  .filter((p: string) => ['page.tsx', 'route.ts'].includes(path.basename(p)))
  .map((p: string) => path.relative(APP, path.dirname(p)).split(path.sep).filter((s: string) => s && !/^\(.*\)$/.test(s)));

const REDIRECTED = LEGACY_TEACHER_REDIRECTS.map((r) => r.source.split('/').filter(Boolean));

function segmentsMatch(pattern: string[], segs: string[]): boolean {
  return pattern.length === segs.length && pattern.every((s: string, i: number) => /^(\[.*\]|:.*)$/.test(s) || s === segs[i]);
}

function opensSomething(url: string): boolean {
  const segs = url.split(/[?#]/)[0].split('/').filter(Boolean);
  if (segs.length === 0) return true;
  return [...ROUTES, ...REDIRECTED].some((pattern: string[]) => segmentsMatch(pattern, segs));
}

// router.push('/x'), router.replace('/x'), href="/x", href={'/x'}, href: '/x' — literal paths only.
const LINK = /(?:router\.(?:push|replace)\(\s*|href=\{?\s*|href:\s*)['"`](\/[^'"`$]*)['"`]/g;

describe('internal links', () => {
  it('every literal link and redirect in the app opens a page (no 404 dead ends)', () => {
    const broken: string[] = [];
    for (const file of files(SRC)) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(LINK)) {
        const url = m[1];
        if (!url.startsWith('/api') && !opensSomething(url)) broken.push(`${path.relative(SRC, file)}: ${url}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
