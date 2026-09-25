import { describe, expect, it } from 'vitest';
import { badgeVariants } from '../src/components/ui/badge-variants';
import { readSource } from './support/source';

const ui = (file: string) => readSource(`src/components/ui/${file}`);
const tokens = (s: string) => s.split(/\s+/).filter(Boolean);

describe('badges and chips', () => {
  it.each([['secure', 'bg-secure', 'text-secure-strong'], ['building', 'bg-building', 'text-building-strong'], ['weak', 'bg-weak', 'text-weak-strong']] as const)(
    '%s chip uses its soft fill and strong text (spec §2.1)', (variant, fill, ink) => {
      expect(tokens(badgeVariants({ variant }))).toEqual(expect.arrayContaining([fill, ink]));
    },
  );

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

  it('avatars use the accent pair', () => {
    expect(ui('avatar.tsx')).toMatch(/bg-accent text-accent-foreground/);
  });
});
