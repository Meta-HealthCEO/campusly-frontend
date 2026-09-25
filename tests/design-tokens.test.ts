import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pairContrast } from '../src/lib/design/contrast';
import { MIN_RATIO, REQUIRED_TOKENS, TOKEN_PAIRS, readTokenBlock, type TokenPair } from '../src/lib/design/token-pairs';

const root = (p: string) => path.resolve(__dirname, '..', p);
const css = readFileSync(root('src/app/globals.css'), 'utf8');
const layout = readFileSync(root('src/app/layout.tsx'), 'utf8');
const light = readTokenBlock(css, ':root');
const THEMES: Record<string, Record<string, string>> = { light, dark: { ...light, ...readTokenBlock(css, '.dark') } };
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
      primary: '#1554F0', accent: '#EAF0FE', ring: '#1554F0', 'secure-strong': '#137A6B', 'building-strong': '#8A5A00',
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
