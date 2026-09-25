import { describe, expect, it } from 'vitest';
import { findColourLiterals } from '../src/lib/design/palette-scan';
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

describe('phone and top bars (spec §3)', () => {
  it('the bottom nav is phones only and clears the home bar', () => {
    expect(layout('BottomNav.tsx')).toMatch(/md:hidden/);
    expect(layout('BottomNav.tsx')).toMatch(/pb-\[env\(safe-area-inset-bottom\)\]/);
    expect(layout('BottomNav.tsx')).toMatch(/phoneTabs\(/);
  });

  it('the top bar names the account button on phones and has no drawer toggle', () => {
    expect(layout('TopBar.tsx')).toMatch(/aria-label="Account menu"/);
    expect(layout('TopBar.tsx')).not.toMatch(/toggleSidebar/);
  });

  it('banners sit in one accent strip under the top bar', () => {
    expect(layout('BannerStrip.tsx')).toMatch(/bg-accent/);
    expect(readSource('src/app/(dashboard)/layout.tsx')).toMatch(/<BannerStrip \/>/);
  });

  it('the content column is 1200px with 16px phone and 32px desktop gutters', () => {
    const dash = readSource('src/app/(dashboard)/layout.tsx');
    expect(dash).toMatch(/max-w-\[1200px\]/);
    expect(dash).toMatch(/px-4/);
    expect(dash).toMatch(/lg:px-8/);
    expect(dash).not.toMatch(/data-portal/);
  });

  it.each(['BottomNav.tsx', 'TopBar.tsx', 'BannerStrip.tsx'])('%s has no teacher: variant and no colour literal', (file) => {
    expect(layout(file)).not.toMatch(/(?<![\w-])teacher:/);
    expect(findColourLiterals(layout(file))).toEqual([]);
  });
});
