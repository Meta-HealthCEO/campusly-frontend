/** WCAG 2 contrast for the token table (spec §2.2) and the /design gallery. Hex and rgb() only. */
export type Rgba = readonly [number, number, number, number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i;

export function parseColour(value: string): Rgba {
  const v = value.trim();
  const hex = HEX.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c: string) => c + c).join('') : hex[1];
    const at = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [at(0), at(2), at(4), 1];
  }
  const rgb = RGB.exec(v);
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha];
  }
  throw new Error(`Unsupported colour: ${value}`);
}

/** `top` painted over an opaque `base`. */
export function composite(top: Rgba, base: Rgba): Rgba {
  const a = top[3];
  return [top[0] * a + base[0] * (1 - a), top[1] * a + base[1] * (1 - a), top[2] * a + base[2] * (1 - a), 1];
}

export function relativeLuminance([r, g, b]: Rgba): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [relativeLuminance(fg), relativeLuminance(bg)].sort((x: number, y: number) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` on `bg`, where `bg` (at `bgAlpha`) sits on `ground`: tints are judged as painted. */
export function pairContrast(fg: string, bg: string, ground: string, bgAlpha = 1): number {
  const g = parseColour(ground);
  const b = parseColour(bg);
  const painted = composite([b[0], b[1], b[2], b[3] * bgAlpha], g);
  return contrastRatio(composite(parseColour(fg), painted), painted);
}
