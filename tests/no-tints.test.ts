import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findSoftEdges, findTints } from '../src/lib/design/palette-scan';
import { TOKEN_PAIRS, readTokenBlock, resolveTokens, type TokenPair } from '../src/lib/design/token-pairs';
import { importClosure } from './support/import-closure';
import { DESIGN_SCOPE } from './support/design-scope';
import { ROOT, listSourceFiles, readSource } from './support/source';

/**
 * Orchestrator ruling O1 (revised) and Task 17: colour lives only in solid marks; every surface is neutral.
 * Covers the whole in-scope closure (landing and auth, the shell, every page a standalone teacher can open, and
 * everything they import) plus the Blueprint component folders and the /design gallery.
 */
const BLUEPRINT = [
  'src/components/ui', 'src/components/shared', 'src/components/layout', 'src/components/readiness',
  'src/components/design-gallery', 'src/components/auth', 'src/components/subscription', 'src/components/notifications',
].flatMap((dir: string) => listSourceFiles(dir));
const CLOSURE = [...new Set([
  ...importClosure(DESIGN_SCOPE['landing+auth']), ...importClosure(DESIGN_SCOPE.shell), ...importClosure(DESIGN_SCOPE['teacher pages']),
  // Learner portal (ledger ruling R-L3): every page a standalone teacher's learner can open.
  ...importClosure(DESIGN_SCOPE['learner pages']),
  ...importClosure(['src/app/design/page.tsx']), ...BLUEPRINT,
])].sort();

const css = readFileSync(path.join(ROOT, 'src/app/globals.css'), 'utf8');
const light = readTokenBlock(css, ':root');
const THEMES = { light: resolveTokens(light), dark: resolveTokens({ ...light, ...readTokenBlock(css, '.dark') }) };
const NEUTRAL_SURFACES = ['background', 'card', 'popover', 'muted', 'secondary'];
/** Tokens whose names suggest a tint; a background in one is allowed only while it resolves to a neutral surface. */
const SOFT = /(?<![\w-])(?:[\w\-[\]=&>*.()%]+:)*bg-(accent|accent-soft|secondary|success-soft|attention-soft|info-soft|destructive-soft|secure|building|weak|sidebar-accent)(?![\w-])/g;
/** A selected row marked by a coloured left rail (the accent-rail cliché, Task 17): a class string with both. */
const RAIL = /['"`][^'"`]*\bborder-l-(?:2|4|\[\d+(?:\.\d+)?px\])\b[^'"`]*\bborder-(?:l-)?(?:primary|success|destructive|attention|info|ring)\b[^'"`]*['"`]/;

describe('no tinted surfaces anywhere in scope', () => {
  it('reaches the whole closure', () => {
    expect(CLOSURE.length).toBeGreaterThan(450);
  });

  it.each(CLOSURE)('%s has no tint', (file) => {
    expect(findTints(readSource(file))).toEqual([]);
  });

  it.each(CLOSURE)('%s has no pale see-through semantic edge', (file) => {
    expect(findSoftEdges(readSource(file))).toEqual([]);
  });

  it.each(CLOSURE)('%s has no coloured left rail', (file) => {
    expect(readSource(file).match(RAIL)?.[0] ?? null).toBeNull();
  });

  it('the contrast table pins no see-through fills, so the gallery shows none', () => {
    expect(TOKEN_PAIRS.filter((p: TokenPair) => p.bgAlpha !== undefined).map((p: TokenPair) => `${p.fg} on ${p.bg}`)).toEqual([]);
  });

  it('every soft-token background used in scope resolves to a neutral surface in both themes', () => {
    const used = new Set(CLOSURE.flatMap((file: string) => [...readSource(file).matchAll(SOFT)].map((m: RegExpMatchArray) => m[1])));
    for (const [theme, tokens] of Object.entries(THEMES)) {
      const neutral = new Set(NEUTRAL_SURFACES.map((t: string) => tokens[t]));
      for (const token of used) expect(neutral.has(tokens[token]), `${theme}: bg-${token} = ${tokens[token]}`).toBe(true);
    }
  });
});
