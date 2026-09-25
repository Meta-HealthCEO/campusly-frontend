import { describe, expect, it } from 'vitest';
import { badgeVariants } from '../src/components/ui/badge-variants';
import { readSource } from './support/source';

const ui = (file: string) => readSource(`src/components/ui/${file}`);
const tokens = (s: string) => s.split(/\s+/).filter(Boolean);

describe('badges and chips', () => {
  it.each([
    ['secure', 'before:bg-mark-secure'], ['building', 'before:bg-mark-building'], ['weak', 'before:bg-mark-weak'],
    ['success', 'before:bg-success'], ['attention', 'before:bg-attention'], ['destructive', 'before:bg-destructive'], ['info', 'before:bg-info'],
  ] as const)('%s chip is a solid 8px dot and a foreground label on no fill (ruling O1 revised)', (variant, dot) => {
    const classes = tokens(badgeVariants({ variant }));
    expect(classes).toEqual(expect.arrayContaining([dot, 'before:size-2', 'before:rounded-full', 'text-foreground', 'bg-transparent']));
    expect(classes.filter((c: string) => /^bg-(?!transparent)/.test(c))).toEqual([]);
  });

  it('is a pill', () => {
    expect(tokens(badgeVariants())).toContain('rounded-full');
  });

  it('keeps badgeVariants importable from badge.tsx', () => {
    expect(ui('badge.tsx')).toMatch(/export \{ Badge, badgeVariants \}/);
  });
});

describe('cards (spec §2.4: 16px, 1px border, the one resting shadow)', () => {
  it('uses the card radius, border and shadow, not the stock ring', () => {
    const card = ui('card.tsx');
    expect(card).toMatch(/rounded-card/);
    expect(card).toMatch(/shadow-card/);
    expect(card).toMatch(/border border-border/);
    expect(card).not.toMatch(/ring-foreground\/10/);
  });
});

describe('tables (spec §4: muted head row, row hover)', () => {
  it('puts the head row on the muted fill and hovers rows', () => {
    const table = ui('table.tsx');
    expect(table).toMatch(/bg-muted/);
    expect(table).toMatch(/hover:bg-muted\/60/);
  });
});

describe('quiet fills', () => {
  it.each(['skeleton.tsx', 'progress.tsx'])('%s sits on the muted fill', (file) => {
    expect(ui(file)).toMatch(/bg-muted/);
  });

  it('avatars are a neutral fill with foreground initials (ruling O1 revised)', () => {
    expect(ui('avatar.tsx')).toMatch(/bg-muted text-foreground/);
  });
});
