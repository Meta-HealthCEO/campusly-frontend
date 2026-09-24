import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Teacher-facing files already on semantic tokens. Add a file here when its page is migrated (plan 1B). */
const MIGRATED = [
  'src/components/shared/StatusChip.tsx',
  'src/components/shared/StatCard.tsx',
  'src/components/shared/PageHeader.tsx',
  'src/components/shared/EmptyState.tsx',
  'src/components/shared/ModuleOffState.tsx',
  'src/components/students/LearnerQuickStats.tsx',
  'src/app/(dashboard)/teacher/students/[id]/page.tsx',
  'src/app/(dashboard)/teacher/policies/[id]/page.tsx',
  'src/components/hod/RequestChangesDialog.tsx',
  'src/components/hod/ModerationQueueTable.tsx',
];

const RAW = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|decoration)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g;

describe('teacher colour guard', () => {
  it.each(MIGRATED)('%s uses only semantic colour tokens', (file) => {
    const source = readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    expect(source.match(RAW) ?? []).toEqual([]);
  });

  it('catches a raw palette class', () => {
    expect('className="text-red-500 bg-emerald-50"'.match(RAW)).toEqual(['text-red-500', 'bg-emerald-50']);
  });
});
