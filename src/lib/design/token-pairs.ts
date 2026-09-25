/**
 * Every text/background pair the components use (spec §2.2): text needs 4.5:1, UI edges and
 * chart marks 3:1. `--border` is a decorative hairline, never the only sign of a control (ruling R6).
 */
/** text 4.5:1; large = WCAG large text (19px bold here, 3:1); ui = edges and marks 3:1. */
export type ContrastUse = 'text' | 'large' | 'ui';

export interface TokenPair {
  fg: string;
  bg: string;
  use: ContrastUse;
  /** The fill painted at this opacity over the ground, e.g. primary at 10%. */
  bgAlpha?: number;
  ground?: 'background' | 'card';
}

export const MIN_RATIO: Record<ContrastUse, number> = { text: 4.5, large: 3, ui: 3 };

const text = (fg: string, bg: string, extra: Partial<TokenPair> = {}): TokenPair => ({ fg, bg, use: 'text', ...extra });
const ui = (fg: string, bg: string): TokenPair => ({ fg, bg, use: 'ui' });
/** Exam-map tile text is 19px bold, WCAG large text (ruling O1 final): white on the weak orange is 3.56:1. */
const large = (fg: string, bg: string): TokenPair => ({ fg, bg, use: 'large' });

export const TOKEN_PAIRS: readonly TokenPair[] = [
  text('foreground', 'background'), text('foreground', 'card'), text('foreground', 'muted'),
  text('card-foreground', 'card'), text('popover-foreground', 'popover'), text('secondary-foreground', 'secondary'),
  text('muted-foreground', 'background'), text('muted-foreground', 'card'), text('muted-foreground', 'muted'),
  text('primary-foreground', 'primary'), text('primary', 'card'), text('primary', 'background'),
  text('accent-foreground', 'accent'),
  text('destructive', 'card'), text('destructive', 'background'), text('destructive', 'destructive-soft'),
  text('destructive', 'accent'),
  text('success', 'success-soft'), text('attention', 'attention-soft'), text('info', 'info-soft'),
  text('secure-strong', 'secure'), text('building-strong', 'building'), text('weak-strong', 'weak'),
  text('secure-strong', 'card'), text('building-strong', 'card'), text('weak-strong', 'card'),
  large('tile-secure-ink', 'tile-secure'), large('tile-building-ink', 'tile-building'), large('tile-weak-ink', 'tile-weak'),
  text('sidebar-foreground', 'sidebar'), text('sidebar-label', 'sidebar'), text('sidebar-primary', 'sidebar'),
  text('sidebar-accent-foreground', 'sidebar-accent'),
  ui('input', 'card'), ui('input', 'background'), ui('ring', 'card'), ui('ring', 'background'), ui('primary', 'accent'),
  // Ruling O1 (revised): colour lives in solid marks — cobalt icons on neutral tiles, mastery bars and status dots.
  ui('primary', 'muted'), ui('mark-secure', 'card'), ui('mark-building', 'card'), ui('mark-weak', 'card'),
  ui('success', 'card'), ui('attention', 'card'), ui('info', 'card'),
  ui('chart-1', 'card'), ui('chart-2', 'card'), ui('chart-3', 'card'), ui('chart-4', 'card'), ui('chart-5', 'card'),
];

export const REQUIRED_TOKENS: readonly string[] = [
  ...new Set([...TOKEN_PAIRS.flatMap((p: TokenPair) => [p.fg, p.bg]), 'border', 'background', 'card']),
];

/** The custom properties declared in the first `selector { … }` block of a stylesheet. */
export function readTokenBlock(css: string, selector: string): Record<string, string> {
  const open = css.indexOf(`${selector} {`);
  if (open < 0) return {};
  const body = css.slice(open + selector.length + 2, css.indexOf('}', open));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const VAR_REF = /^var\(--([\w-]+)\)$/;

/**
 * Follows `var(--x)` references to their value, as the browser does for tokens on the same element
 * (the mastery scale is defined once and referenced by the tile and mark tokens). An unknown or circular
 * reference is left as written, so a pair test on it fails loudly.
 */
export function resolveTokens(tokens: Record<string, string>): Record<string, string> {
  const resolve = (value: string, seen: ReadonlySet<string>): string => {
    const ref = VAR_REF.exec(value.trim());
    if (!ref || seen.has(ref[1]) || tokens[ref[1]] === undefined) return value;
    const next = resolve(tokens[ref[1]], new Set([...seen, ref[1]]));
    return VAR_REF.test(next.trim()) ? value : next;
  };
  return Object.fromEntries(Object.entries(tokens).map(([name, value]) => [name, resolve(value, new Set([name]))]));
}
