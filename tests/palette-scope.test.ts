import { describe, expect, it } from 'vitest';
import { findColourLiterals, findPaletteClasses } from '../src/lib/design/palette-scan';
import { importClosure } from './support/import-closure';
import { COLOUR_LITERAL_EXEMPT, DESIGN_SCOPE, type DesignArea } from './support/design-scope';
import { readSource } from './support/source';

/** Areas whose palette classes are gone (spec §6). Plan Tasks 13–15 add to these. */
const PALETTE_SWEPT: DesignArea[] = ['landing+auth', 'shell', 'teacher pages'];
/** Areas whose colour literals are gone (spec §7). */
const LITERAL_SWEPT: DesignArea[] = ['landing+auth', 'shell', 'teacher pages'];

describe('scope (generated from the imports, ruling R3)', () => {
  it('follows the teacher pages into their components', () => {
    expect(importClosure(DESIGN_SCOPE['teacher pages'])).toEqual(expect.arrayContaining([
      'src/components/curriculum/CurriculumTreeNodeRow.tsx',
      'src/components/student-360/AcademicSummaryCard.tsx',
      'src/components/shared/PageHeader.tsx',
    ]));
  });

  it('does not follow the src/types barrel into admin-only style maps', () => {
    expect(importClosure(DESIGN_SCOPE['landing+auth'])).not.toContain('src/types/migration.ts');
  });
});

describe.each(PALETTE_SWEPT)('%s: palette classes', (area) => {
  const files = importClosure(DESIGN_SCOPE[area]);

  it('reaches real files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files)('%s has none', (file) => {
    expect(findPaletteClasses(readSource(file))).toEqual([]);
  });
});

describe.each(LITERAL_SWEPT)('%s: colour literals', (area) => {
  const files = importClosure(DESIGN_SCOPE[area]).filter((f: string) => !(f in COLOUR_LITERAL_EXEMPT));

  it.each(files)('%s has none', (file) => {
    expect(findColourLiterals(readSource(file))).toEqual([]);
  });
});
