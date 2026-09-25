import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pairContrast } from '../src/lib/design/contrast';
import { MIN_RATIO, REQUIRED_TOKENS, TOKEN_PAIRS, readTokenBlock, resolveTokens, type TokenPair } from '../src/lib/design/token-pairs';
import { listSourceFiles } from './support/source';
import { COLOUR_LITERAL_EXEMPT } from './support/design-scope';

const root = (p: string) => path.resolve(__dirname, '..', p);
const css = readFileSync(root('src/app/globals.css'), 'utf8');
const layout = readFileSync(root('src/app/layout.tsx'), 'utf8');
const RAW = { light: readTokenBlock(css, ':root'), dark: readTokenBlock(css, '.dark') };
/** Both blocks sit on <html>, so dark = light overridden by .dark, then every `var(--x)` followed (as the browser does). */
const THEMES: Record<string, Record<string, string>> = { light: resolveTokens(RAW.light), dark: resolveTokens({ ...RAW.light, ...RAW.dark }) };
const LEVELS = ['secure', 'building', 'weak'];
const name = (p: TokenPair) => `${p.fg} on ${p.bg}${p.bgAlpha ? ` at ${p.bgAlpha * 100}%` : ''}`;

describe.each(Object.entries(THEMES))('%s theme', (_theme, tokens) => {
  it('defines every token the components use', () => {
    expect(REQUIRED_TOKENS.filter((t: string) => !tokens[t])).toEqual([]);
  });

  it.each(TOKEN_PAIRS.map((p: TokenPair) => [name(p), p] as const))('%s meets WCAG AA', (_label, p) => {
    const ratio = pairContrast(tokens[p.fg], tokens[p.bg], tokens[p.ground ?? 'card'], p.bgAlpha ?? 1);
    expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO[p.use]);
  });
});

describe('spec values (§2, as amended by ruling R6)', () => {
  it('pins the brand, ink and ground', () => {
    expect(THEMES.light).toMatchObject({
      background: '#F3F5FA', card: '#FFFFFF', foreground: '#0B1B33', 'muted-foreground': '#5B6B82',
      primary: '#1554F0', accent: '#EEF1F7' /* neutral since ruling O1 revised */, ring: '#1554F0', 'secure-strong': '#137A6B', 'building-strong': '#8A5A00',
      'weak-strong': '#B5392A', destructive: '#B5392A', input: '#7F8DA3', border: '#E2E7F0',
    });
    expect(THEMES.dark).toMatchObject({
      background: '#0A1222', card: '#111B2E', foreground: '#E8EEF8', primary: '#6B95FF',
      'primary-foreground': '#08142B', ring: '#6B95FF', 'secure-strong': '#3CC3AE', input: '#5A6B88',
    });
  });

  it('carries the type scale, radii, depth and motion', () => {
    for (const rule of [
      '--text-caption: 12px', '--text-small: 13px', '--text-body: 15px', '--text-h3: 17px', '--text-h2: 20px',
      '--text-h1: 24px', '--text-h1-desktop: 30px', '--text-display: 36px', '--text-eyebrow: 11.5px',
      '--radius-control: 10px', '--radius-card: 16px',
      '--shadow-card: 0 1px 2px rgb(11 27 51 / 0.04)', '--shadow-overlay: 0 12px 32px -12px rgb(11 27 51 / 0.25)',
      '--ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1)',
    ]) expect(css).toContain(rule);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});

describe('orchestrator ruling O1 (revised): colour only in solid marks, every surface neutral', () => {
  const SOFT = ['accent', 'accent-soft', 'secure', 'building', 'weak', 'success-soft', 'attention-soft', 'info-soft', 'destructive-soft', 'sidebar-accent'];

  it.each(Object.entries(THEMES))('%s: every soft token is the neutral muted surface', (_theme, tokens) => {
    expect(Object.fromEntries(SOFT.map((t: string) => [t, tokens[t]])))
      .toEqual(Object.fromEntries(SOFT.map((t: string) => [t, tokens.muted])));
    expect(tokens['accent-foreground']).toBe(tokens.foreground);
    expect(tokens['sidebar-accent-foreground']).toBe(tokens.foreground);
  });

  it.each(Object.entries(THEMES))('%s: tiles are the solid mastery fills with white ink, identical in both themes', (_theme, tokens) => {
    for (const level of LEVELS) {
      expect(tokens[`tile-${level}`], `tile-${level}`).toBe(THEMES.light[`mastery-${level}`]);
      expect(tokens[`tile-${level}-ink`], `tile-${level}-ink`).toBe('#FFFFFF');
    }
  });

  it('light: bars, legend and status dots are the mastery colours themselves', () => {
    for (const level of LEVELS) expect(THEMES.light[`mark-${level}`], `mark-${level}`).toBe(THEMES.light[`mastery-${level}`]);
  });

  it('dark: bars, legend and status dots use lighter mark variants (3:1 on the dark card is pinned in TOKEN_PAIRS)', () => {
    for (const level of LEVELS) expect(THEMES.dark[`mark-${level}`], `mark-${level}`).not.toBe(THEMES.dark[`tile-${level}`]);
  });

  it('keeps the AA text colours for mastery words', () => {
    expect(THEMES.light).toMatchObject({ 'secure-strong': '#137A6B', 'building-strong': '#8A5A00', 'weak-strong': '#B5392A' });
  });
});

describe('orchestrator ruling O1 (revised 3): the mastery scale is a CSS-only swap', () => {
  it('holds the three colours only in --mastery-* (+ dark mark variants); tiles and marks reference them', () => {
    for (const level of LEVELS) {
      expect(RAW.light[`tile-${level}`]).toBe(`var(--mastery-${level})`);
      expect(RAW.light[`tile-${level}-ink`]).toBe('var(--mastery-ink)');
      expect(RAW.light[`mark-${level}`]).toBe(`var(--mastery-${level}-mark)`);
      expect(RAW.light[`mastery-${level}-mark`]).toBe(`var(--mastery-${level})`);
      expect(RAW.dark[`mastery-${level}-mark`]).toMatch(/^#[0-9A-F]{6}$/);
      expect(RAW.dark[`tile-${level}`]).toBeUndefined();
      expect(RAW.dark[`mark-${level}`]).toBeUndefined();
    }
  });

  it('uses the final scale (Shaun approved): secure #0B7F63, building #4F58D0, weak #EA580C, white ink', () => {
    expect(THEMES.light).toMatchObject({
      'mastery-secure': '#0B7F63', 'mastery-building': '#4F58D0', 'mastery-weak': '#EA580C', 'mastery-ink': '#FFFFFF',
    });
  });

  it('checks white tile ink at the large-text level (3:1): tile text is 19px bold, WCAG large text', () => {
    const tilePairs = TOKEN_PAIRS.filter((p: TokenPair) => p.bg.startsWith('tile-'));
    expect(tilePairs.map((p: TokenPair) => [p.fg, p.bg, p.use])).toEqual(LEVELS.map((l: string) => [`tile-${l}-ink`, `tile-${l}`, 'large']));
    expect(MIN_RATIO.large).toBe(3);
  });

  it('keeps --destructive apart from the mastery colours in both themes', () => {
    for (const tokens of Object.values(THEMES)) {
      const mastery = LEVELS.flatMap((level: string) => [tokens[`mastery-${level}`], tokens[`mark-${level}`]]);
      expect(mastery).not.toContain(tokens.destructive);
    }
  });

  it('writes no mastery hex anywhere in src except globals.css', () => {
    const hexes = [...new Set(Object.values(THEMES).flatMap((t: Record<string, string>) => LEVELS.flatMap((l: string) => [t[`mastery-${l}`], t[`mark-${l}`]])))];
    // The exempt data palettes (ruling R4) may share a hex by chance: economics' book cover is orange-600.
    const offenders = listSourceFiles('src').filter((file: string) => !(file in COLOUR_LITERAL_EXEMPT)).filter((file: string) => {
      const src = readFileSync(root(file), 'utf8').toUpperCase();
      return hexes.some((hex: string) => src.includes(hex.toUpperCase()));
    });
    expect(offenders).toEqual([]);
  });
});

describe('one look for every portal', () => {
  it('has no portal-scoped tokens and no teacher variant', () => {
    expect(css).not.toMatch(/data-portal/);
    expect(css).not.toMatch(/@custom-variant teacher/);
  });

  it('sets tokens only on :root and .dark, so portaled dialogs, sheets and toasts get them too', () => {
    const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*--(?:background|primary|card):/g)].map((m: RegExpMatchArray) => m[1].trim());
    expect(selectors.sort()).toEqual(['.dark', ':root']);
  });

  it('loads Hanken Grotesk and Source Sans 3 with swap and puts them on <html> (spec §2.3, ruling R8)', () => {
    expect(layout).toMatch(/Hanken_Grotesk\(/);
    expect(layout).toMatch(/Source_Sans_3\(/);
    expect(layout.match(/display: 'swap'/g) ?? []).toHaveLength(2);
    expect(layout).toMatch(/<html[^>]*className=\{`\$\{display\.variable\} \$\{body\.variable\}/);
    expect(layout).not.toMatch(/\bInter\b/);
    expect(css).toContain('--font-sans: var(--font-body)');
    expect(css).toContain('--font-heading: var(--font-display)');
    expect(css).toContain('--font-mono: var(--font-display)');
  });

  it('leaves no night-back scope behind', () => {
    for (const gone of ['src/lib/fonts/teacher-fonts.ts', 'src/lib/portal-scope.ts', 'src/hooks/usePortalScope.ts']) {
      expect(existsSync(root(gone)), gone).toBe(false);
    }
  });
});
