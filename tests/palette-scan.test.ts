import { describe, expect, it } from 'vitest';
import { findColourLiterals, findPaletteClasses, findSoftEdges, findTints } from '../src/lib/design/palette-scan';

describe('findPaletteClasses (ruling R4)', () => {
  it('finds palette classes with variants and opacity', () => {
    expect(findPaletteClasses('className="text-red-500 dark:hover:bg-emerald-50 ring-blue-600/40"'))
      .toEqual(['text-red-500', 'dark:hover:bg-emerald-50', 'ring-blue-600/40']);
  });

  it('catches border sides, ring offsets and gradient stops', () => {
    expect(findPaletteClasses('border-l-amber-400 ring-offset-slate-100 from-indigo-500 to-violet-600'))
      .toEqual(['border-l-amber-400', 'ring-offset-slate-100', 'from-indigo-500', 'to-violet-600']);
  });

  it('ignores tokens, white/black and look-alikes', () => {
    expect(findPaletteClasses('bg-primary text-muted-foreground bg-black/40 text-white bg-secure-strong border-input grid-cols-12 text-red')).toEqual([]);
  });
});

describe('findColourLiterals', () => {
  it('finds hex in arbitrary values and in strings', () => {
    expect(findColourLiterals(`text-[#2563EB] hover:bg-[#1d4ed8] const c = '#10b981'; stroke="#fff"`))
      .toEqual(['[#2563EB]', '[#1d4ed8]', "'#10b981'", '"#fff"']);
  });

  it('ignores anchors and ids that start with #', () => {
    expect(findColourLiterals('href="#features" to="#faq-list"')).toEqual([]);
  });
});

describe('findTints (orchestrator ruling O1 revised: no tinted surfaces)', () => {
  it('finds see-through fills of a colour token, with any variant', () => {
    expect(findTints('bg-destructive/10 hover:bg-destructive/15 data-[x=y]:bg-primary/5 bg-success/20 bg-secure-strong/30'))
      .toEqual(['bg-destructive/10', 'hover:bg-destructive/15', 'data-[x=y]:bg-primary/5', 'bg-success/20', 'bg-secure-strong/30']);
  });

  it('finds tinted gradient washes and arbitrary alphas too', () => {
    expect(findTints('bg-linear-to-br from-primary/5 to-transparent via-primary/10 to-primary/15 bg-primary/[0.04]'))
      .toEqual(['bg-linear-to-br', 'from-primary/5', 'via-primary/10', 'to-primary/15', 'bg-primary/[0.04]']);
  });

  it('finds arbitrary colour washes and gradient utilities (Task 17)', () => {
    expect(findTints('bg-[#1554F0]/10 hover:bg-[rgba(21,84,240,0.08)] bg-[color-mix(in_srgb,var(--primary)_8%,white)] bg-gradient-to-r bg-linear-to-br'))
      .toEqual(['bg-[#1554F0]/10', 'hover:bg-[rgba(21,84,240,0.08)]', 'bg-[color-mix(in_srgb,var(--primary)_8%,white)]', 'bg-gradient-to-r', 'bg-linear-to-br']);
  });

  it('leaves image and size arbitrary values alone', () => {
    expect(findTints("bg-[url('/grid.svg')] bg-[length:20px_20px] bg-muted/50 bg-black/40")).toEqual([]);
  });

  it('allows solid marks, hover on a solid, and neutral see-through fills', () => {
    expect(findTints('bg-primary hover:bg-primary/90 bg-muted/50 bg-black/40 bg-foreground/10 bg-input/30 bg-card/95 bg-primary-foreground')).toEqual([]);
  });
});

describe('findSoftEdges (Task 17: a semantic edge is solid, never a pale see-through line)', () => {
  it('finds translucent semantic borders, rings, outlines and dividers, with variants', () => {
    expect(findSoftEdges('border-success/40 hover:border-primary/50 ring-2 ring-primary/40 focus-within:ring-ring/50 border-l-destructive/30 divide-info/20'))
      .toEqual(['border-success/40', 'hover:border-primary/50', 'ring-primary/40', 'focus-within:ring-ring/50', 'border-l-destructive/30', 'divide-info/20']);
  });

  it('allows solid edges and neutral see-through edges', () => {
    expect(findSoftEdges('border-success border-primary ring-ring border-border/60 border-muted-foreground/25 ring-black/5 border-white/30')).toEqual([]);
  });
});
