import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Tailwind 4 scans every file in the repo for class names, markdown included.
// Long plans and specs in docs/ contain text that Tailwind reads as CSS escapes
// ("Invalid code point"), which broke `next build` on a docs-only commit.
describe('Tailwind source scanning', () => {
  it('skips the docs folder', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(css).toMatch(/@source not "\.\.\/\.\.\/docs";/);
  });
});
