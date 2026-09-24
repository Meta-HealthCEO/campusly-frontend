import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(path.resolve(__dirname, '../src/lib/fonts/teacher-fonts.ts'), 'utf8');

describe('teacher fonts', () => {
  it('are not preloaded, so other portals never download them', () => {
    const faces = source.match(/\b(Bricolage_Grotesque|Instrument_Sans|JetBrains_Mono)\(/g) ?? [];
    expect(faces).toHaveLength(3);
    expect(source.match(/preload:\s*false/g) ?? []).toHaveLength(3);
  });
});
