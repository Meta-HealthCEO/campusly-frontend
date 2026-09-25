import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** CLAUDE.md: max 350 lines per file. Files this programme reshapes are held to it here. */
const WATCHED = ['src/lib/constants.ts', 'src/lib/nav/teacher-nav.ts', 'src/components/layout/Sidebar.tsx', 'src/components/layout/BottomNav.tsx', 'src/components/layout/SidebarNav.tsx', 'src/components/layout/SidebarNavItem.tsx'];

describe('file size budget', () => {
  it.each(WATCHED)('%s stays within 350 lines', (file) => {
    const lines = readFileSync(path.resolve(__dirname, '..', file), 'utf8').split(/\r?\n/).length;
    expect(lines).toBeLessThanOrEqual(351);
  });
});
