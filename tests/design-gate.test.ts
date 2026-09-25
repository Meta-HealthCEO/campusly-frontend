import { describe, expect, it } from 'vitest';
import { fileSizeViolations, parseNameStatus } from '../scripts/design-gate-lib.mjs';

describe('parseNameStatus', () => {
  it('reads git diff --name-status, keeps the new path of a rename and drops deletions', () => {
    expect(parseNameStatus('A\tsrc/a.ts\nM\tsrc/b.tsx\nD\tsrc/c.ts\nR100\tsrc/old.ts\tsrc/new.ts\n')).toEqual([
      { status: 'A', path: 'src/a.ts' }, { status: 'M', path: 'src/b.tsx' }, { status: 'R', path: 'src/new.ts' },
    ]);
  });
});

describe('fileSizeViolations (spec §7: new files ≤ 300 lines, touched ≤ 350)', () => {
  it('holds new files to 300 and touched files to 350', () => {
    expect(fileSizeViolations([
      { path: 'src/new.tsx', status: 'A', lines: 301 },
      { path: 'src/ok-new.tsx', status: 'A', lines: 300 },
      { path: 'src/old.tsx', status: 'M', lines: 351 },
      { path: 'src/ok-old.tsx', status: 'M', lines: 350 },
    ])).toEqual(['src/new.tsx: 301 lines (new, max 300)', 'src/old.tsx: 351 lines (touched, max 350)']);
  });

  it('ignores files that are not code', () => {
    expect(fileSizeViolations([{ path: 'e2e/baselines/request-sets.json', status: 'A', lines: 900 }])).toEqual([]);
  });
});
