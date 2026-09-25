/**
 * Every text/background pair the components use (spec §2.2): text needs 4.5:1, UI edges and
 * chart marks 3:1. `--border` is a decorative hairline, never the only sign of a control (ruling R6).
 */
export type ContrastUse = 'text' | 'ui';

export interface TokenPair {
  fg: string;
  bg: string;
  use: ContrastUse;
  /** The fill painted at this opacity over the ground, e.g. `bg-primary/10`. */
  bgAlpha?: number;
  ground?: 'background' | 'card';
}

export const MIN_RATIO: Record<ContrastUse, number> = { text: 4.5, ui: 3 };

const text = (fg: string, bg: string, extra: Partial<TokenPair> = {}): TokenPair => ({ fg, bg, use: 'text', ...extra });
const ui = (fg: string, bg: string): TokenPair => ({ fg, bg, use: 'ui' });

export const TOKEN_PAIRS: readonly TokenPair[] = [
  text('foreground', 'background'), text('foreground', 'card'), text('foreground', 'muted'),
  text('card-foreground', 'card'), text('popover-foreground', 'popover'), text('secondary-foreground', 'secondary'),
  text('muted-foreground', 'background'), text('muted-foreground', 'card'), text('muted-foreground', 'muted'),
  text('primary-foreground', 'primary'), text('primary', 'card'), text('primary', 'background'),
  text('primary', 'primary', { bgAlpha: 0.1, ground: 'card' }), text('accent-foreground', 'accent'),
  text('destructive', 'card'), text('destructive', 'background'), text('destructive', 'destructive-soft'),
  text('destructive', 'destructive', { bgAlpha: 0.1, ground: 'background' }), text('destructive', 'accent'),
  text('success', 'success-soft'), text('attention', 'attention-soft'), text('info', 'info-soft'),
  text('secure-strong', 'secure'), text('building-strong', 'building'), text('weak-strong', 'weak'),
  text('secure-strong', 'card'), text('building-strong', 'card'), text('weak-strong', 'card'),
  text('tile-secure-ink', 'tile-secure'), text('tile-building-ink', 'tile-building'), text('tile-weak-ink', 'tile-weak'),
  text('sidebar-foreground', 'sidebar'), text('sidebar-label', 'sidebar'), text('sidebar-primary', 'sidebar'),
  text('sidebar-accent-foreground', 'sidebar-accent'),
  ui('input', 'card'), ui('input', 'background'), ui('ring', 'card'), ui('ring', 'background'), ui('primary', 'accent'),
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
