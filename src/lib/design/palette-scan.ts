const HUES = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone';
const UTILITIES = 'bg|text|border(?:-[trblxy])?|ring(?:-offset)?|from|to|via|fill|stroke|outline|divide|decoration|placeholder|caret|accent|shadow';

/** A Tailwind palette class (spec §6, ruling R4): a named hue or grey with a numeric shade, any variants, optional opacity. */
export const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:${UTILITIES})-(?:${HUES})-\\d{2,3}(?:/\\d{1,3})?(?![\\w-])`, 'g');

/** A colour literal in code (spec §7): an arbitrary hex value (`bg-[#2563eb]`) or a quoted hex string (`'#10b981'`). */
export const COLOUR_LITERAL = /\[#[0-9a-fA-F]{3,8}\]|['"`]#[0-9a-fA-F]{3,8}['"`]/g;

const TINT_TOKENS = 'primary|destructive|success|attention|info|ring|chart-[1-5]|(?:secure|building|weak)(?:-strong)?|(?:mark|tile)-(?:secure|building|weak)';

const VARIANTS = String.raw`(?:[\w\-\[\]=&>*.()%]+:)*`;
const TINT_FORMS = [
  // a colour token painted see-through (under 80%, or an arbitrary alpha) as a fill or a gradient stop
  String.raw`(?:bg|from|via|to)-(?:${TINT_TOKENS})/(?:[1-7]?\d|\[[^\]]+\])(?![\w-])`,
  // an arbitrary colour with an alpha, or written as rgba/hsla/color-mix (Task 17)
  String.raw`bg-\[[^\]]+\]/(?:\d+|\[[^\]]+\])`,
  String.raw`bg-\[(?:rgba?|hsla?|color-mix)\([^\]]*\]`,
  // any gradient wash (Task 17): Blueprint has no gradients
  String.raw`bg-(?:gradient|linear|radial)(?:-[\w-]+)?`,
];

/**
 * A tinted surface (orchestrator ruling O1 revised, widened in Task 17): a see-through colour wash, an arbitrary colour
 * wash or a gradient, e.g. `bg-destructive/10`. Solid marks, a hover on a solid (`hover:bg-primary/90`), neutral
 * see-through fills (`bg-muted/50`, `bg-black/40`) and image backgrounds are allowed.
 */
export const TINT_CLASS = new RegExp(`(?<![\\w-])${VARIANTS}(?:${TINT_FORMS.join('|')})`, 'g');

/**
 * A pale see-through edge in a semantic colour (Task 17), e.g. `border-success/40`: the meaning is carried by a solid
 * 1px edge instead. Neutral see-through edges (`border-border/60`, `ring-black/5`) are allowed.
 */
export const SOFT_EDGE_CLASS = new RegExp(
  `(?<![\\w-])${VARIANTS}(?:border(?:-[trblxy])?|ring|outline|divide)-(?:${TINT_TOKENS})/(?:[1-7]?\\d|\\[[^\\]]+\\])(?![\\w-])`,
  'g',
);

export function findSoftEdges(source: string): string[] {
  return source.match(SOFT_EDGE_CLASS) ?? [];
}

export function findTints(source: string): string[] {
  return source.match(TINT_CLASS) ?? [];
}

export function findPaletteClasses(source: string): string[] {
  return source.match(PALETTE_CLASS) ?? [];
}

export function findColourLiterals(source: string): string[] {
  return source.match(COLOUR_LITERAL) ?? [];
}
