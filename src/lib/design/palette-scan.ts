const HUES = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone';
const UTILITIES = 'bg|text|border(?:-[trblxy])?|ring(?:-offset)?|from|to|via|fill|stroke|outline|divide|decoration|placeholder|caret|accent|shadow';

/** A Tailwind palette class (spec §6, ruling R4): a named hue or grey with a numeric shade, any variants, optional opacity. */
export const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:${UTILITIES})-(?:${HUES})-\\d{2,3}(?:/\\d{1,3})?(?![\\w-])`, 'g');

/** A colour literal in code (spec §7): an arbitrary hex value (`bg-[#2563eb]`) or a quoted hex string (`'#10b981'`). */
export const COLOUR_LITERAL = /\[#[0-9a-fA-F]{3,8}\]|['"`]#[0-9a-fA-F]{3,8}['"`]/g;

const TINT_TOKENS = 'primary|destructive|success|attention|info|ring|chart-[1-5]|(?:secure|building|weak)(?:-strong)?|(?:mark|tile)-(?:secure|building|weak)';

/**
 * A tinted surface (orchestrator ruling O1 revised): a colour token painted see-through (under 80%, or an arbitrary
 * alpha) as a fill or a gradient stop,
 * e.g. `bg-destructive/10`. Solid marks, a hover on a solid (`hover:bg-primary/90`) and neutral fills are allowed.
 */
export const TINT_CLASS = new RegExp(`(?<![\\w-])(?:[\\w\\-\\[\\]=&>*.()%]+:)*(?:bg|from|via|to)-(?:${TINT_TOKENS})/(?:[1-7]?\\d|\\[[^\\]]+\\])(?![\\w-])`, 'g');

export function findTints(source: string): string[] {
  return source.match(TINT_CLASS) ?? [];
}

export function findPaletteClasses(source: string): string[] {
  return source.match(PALETTE_CLASS) ?? [];
}

export function findColourLiterals(source: string): string[] {
  return source.match(COLOUR_LITERAL) ?? [];
}
