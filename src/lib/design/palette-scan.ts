const HUES = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone';
const UTILITIES = 'bg|text|border(?:-[trblxy])?|ring(?:-offset)?|from|to|via|fill|stroke|outline|divide|decoration|placeholder|caret|accent|shadow';

/** A Tailwind palette class (spec §6, ruling R4): a named hue or grey with a numeric shade, any variants, optional opacity. */
export const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:${UTILITIES})-(?:${HUES})-\\d{2,3}(?:/\\d{1,3})?(?![\\w-])`, 'g');

/** A colour literal in code (spec §7): an arbitrary hex value (`bg-[#2563eb]`) or a quoted hex string (`'#10b981'`). */
export const COLOUR_LITERAL = /\[#[0-9a-fA-F]{3,8}\]|['"`]#[0-9a-fA-F]{3,8}['"`]/g;

export function findPaletteClasses(source: string): string[] {
  return source.match(PALETTE_CLASS) ?? [];
}

export function findColourLiterals(source: string): string[] {
  return source.match(COLOUR_LITERAL) ?? [];
}
