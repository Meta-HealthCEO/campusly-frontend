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
    expect(layout('Sidebar.tsx')).toMatch(/<RailButton label="Open all pages"/);
    expect(layout('Sidebar.tsx')).toMatch(/<SidebarNav/);
  });

  it('rail-only buttons show a visible hint and the All pages trigger sits at the top of the rail (final review 3)', () => {
    const src = layout('Sidebar.tsx');
    expect(src).toMatch(/<RailButton label="Open all pages"/);
    expect(src).toMatch(/<RailButton label="Expand sidebar"/);
    expect(src).toMatch(/<TooltipContent side="right">\{label\}<\/TooltipContent>/);
    expect(src).toMatch(/aria-label=\{label\}/);
    const tablet = src.slice(src.indexOf('{/* Tablet'), src.indexOf('{/* Desktop'));
    expect(tablet.indexOf('<RailButton label="Open all pages"')).toBeLessThan(tablet.indexOf('<SidebarNav'));
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
    // Final review 5: the accessible name contains the visible name (WCAG 2.5.3).
    expect(layout('TopBar.tsx')).toContain('aria-label={`${fullName}, account menu`}');
    expect(layout('TopBar.tsx')).not.toMatch(/toggleSidebar/);
  });

  it('a selected nav item is a neutral fill, a cobalt icon and foreground text (ruling O1 revised)', () => {
    expect(layout('SidebarNavItem.tsx')).toMatch(/<Icon className=\{cn\('size-\[18px\] shrink-0', active && 'text-primary'\)\}/);
    expect(layout('BottomNav.tsx')).toMatch(/current \? 'bg-muted text-foreground \[&>svg\]:text-primary'/);
  });

  it('banners sit in one neutral card-white strip with a hairline under the top bar (ruling O1 revised)', () => {
    expect(layout('BannerStrip.tsx')).toMatch(/border-b border-border bg-card text-foreground/);
    expect(layout('BannerStrip.tsx')).not.toMatch(/bg-accent/);
    expect(readSource('src/components/subscription/TrialBanner.tsx')).not.toMatch(/bg-attention-soft/);
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

describe('More sheet at 320px (final review 4)', () => {
  it('uses two columns below 360px and never breaks a label mid-word', () => {
    const src = layout('BottomNav.tsx');
    expect(src).toMatch(/grid-cols-2 [^"']*min-\[360px\]:grid-cols-3/);
    expect(src).not.toMatch(/break-words|break-all|hyphens-auto/);
  });
});
