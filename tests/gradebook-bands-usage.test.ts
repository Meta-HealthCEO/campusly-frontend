import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('one set of grade colours in the gradebook', () => {
  it.each([
    'src/app/(dashboard)/teacher/grades/page.tsx',
    'src/components/grades/StudentHistoryDialog.tsx',
  ])('%s colours marks with gradeColor', (file) => {
    const source = read(file);
    expect(source).toMatch(/gradeColor\(/);
    expect(source).not.toMatch(/percentage >= 80 \?/);
  });
});
