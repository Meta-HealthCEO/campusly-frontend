import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.resolve(__dirname, '../src/app/globals.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return {};
  const body = css.slice(start + selector.length + 2, css.indexOf('}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

type RGBA = [number, number, number, number];
function parse(color: string): RGBA {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as RGBA;
  const rgba = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4])];
  throw new Error(`Unsupported colour ${color}`);
}
const over = (top: RGBA, base: RGBA): RGBA => [0, 1, 2].map((i) => top[i] * top[3] + base[i] * (1 - top[3])).concat(1) as RGBA;
const lum = ([r, g, b]: RGBA) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: RGBA, b: RGBA) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const PAIRS: Array<[string, string]> = [
  ['foreground', 'background'], ['muted-foreground', 'background'], ['muted-foreground', 'card'],
  ['primary-foreground', 'primary'], ['accent-foreground', 'accent-soft'],
  ['accent-foreground', 'accent'], ['foreground', 'accent'], ['accent-foreground', 'card'], ['success', 'success-soft'],
  ['attention', 'attention-soft'], ['destructive', 'destructive-soft'], ['info', 'info-soft'],
  ['sidebar-foreground', 'sidebar'], ['sidebar-label', 'sidebar'], ['sidebar-primary', 'sidebar'],
];

describe.each([
  ['light', block('[data-portal="teacher"]')],
  ['dark', { ...block('[data-portal="teacher"]'), ...block('.dark [data-portal="teacher"]') }],
])('teacher %s theme', (_theme, tokens) => {
  it('defines every token the portal uses', () => {
    for (const [fg, bg] of PAIRS) {
      expect(tokens[fg], fg).toBeTruthy();
      expect(tokens[bg], bg).toBeTruthy();
    }
  });

  it.each(PAIRS)('keeps %s readable on %s (WCAG AA)', (fg, bg) => {
    const card = parse(tokens.card);
    const base = over(parse(tokens[bg]), card);
    expect(contrast(over(parse(tokens[fg]), base), base)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('tokens outside the teacher portal', () => {
  it('keeps other portals within one shade of their old greens, and readable (§2)', () => {
    // Old trend/chip green was emerald-600/700; one shade either way, AA on the soft green.
    expect(block(':root').success).toBe('#047857');
    expect(block('.dark').success).toBe('#10b981');
    expect(contrast(parse('#047857'), over(parse(block(':root')['success-soft']), parse('#ffffff')))).toBeGreaterThanOrEqual(4.5);
  });
});
