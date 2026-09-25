import { describe, expect, it } from 'vitest';
import { findColourLiterals } from './support/colour-literals';
import { readSource } from './support/source';

const layout = (file: string) => readSource(`src/components/layout/${file}`);

describe('sidebar (spec §3)', () => {
  it('is hidden on phones, a 56px rail on tablets and 232px on desktops', () => {
    const sidebar = layout('Sidebar.tsx');
    expect(sidebar).toMatch(/hidden md:flex/);
    expect(sidebar).toMatch(/\bw-14\b/);
    expect(sidebar).toMatch(/lg:w-\[232px\]/);
  });

  it('keeps every link reachable on tablets through the full nav in a sheet', () => {
    expect(layout('Sidebar.tsx')).toMatch(/aria-label="Open all pages"/);
    expect(layout('Sidebar.tsx')).toMatch(/<SidebarNav/);
  });

  it('decides the active item with the shared helper', () => {
    expect(layout('SidebarNav.tsx')).toMatch(/isNavItemActive\(/);
  });

  it('names icon-only rail items', () => {
    expect(layout('SidebarNavItem.tsx')).toMatch(/aria-label=\{collapsed \? item\.label : undefined\}/);
  });

  it.each(['Sidebar.tsx', 'SidebarNav.tsx', 'SidebarNavItem.tsx'])('%s has no teacher: variant and no colour literal', (file) => {
    expect(layout(file)).not.toMatch(/(?<![\w-])teacher:/);
    expect(findColourLiterals(layout(file))).toEqual([]);
  });
});
