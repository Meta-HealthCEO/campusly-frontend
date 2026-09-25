import { describe, expect, it } from 'vitest';
import { buttonVariants } from '../src/components/ui/button-variants';
import { FOCUS_RING, TOUCH_TARGET } from '../src/components/ui/focus';
import { readSource } from './support/source';

const tokens = (classes: string) => classes.split(/\s+/).filter(Boolean);
const includesAll = (classes: string, wanted: string) => tokens(wanted).every((c: string) => tokens(classes).includes(c));
const ui = (file: string) => readSource(`src/components/ui/${file}`);

describe('focus and touch constants (spec §2.4)', () => {
  it('draws a 2px ring with a 2px offset', () => {
    expect(tokens(FOCUS_RING)).toEqual(expect.arrayContaining(['focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2']));
  });

  it('makes a 44px target on phones only', () => {
    expect(TOUCH_TARGET).toBe('min-h-11 md:min-h-0');
  });
});

describe('buttons', () => {
  it.each(['default', 'lg', 'icon', 'icon-lg'] as const)('%s is a 44px touch target on phones', (size) => {
    expect(includesAll(buttonVariants({ size }), TOUCH_TARGET)).toBe(true);
  });

  it.each(['icon', 'icon-lg'] as const)('%s is 44px wide on phones too', (size) => {
    expect(tokens(buttonVariants({ size }))).toContain('min-w-11');
  });

  it.each(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const)('%s shows the focus ring', (variant) => {
    expect(includesAll(buttonVariants({ variant }), FOCUS_RING)).toBe(true);
  });

  it('primary is the one filled cobalt button', () => {
    expect(tokens(buttonVariants({ variant: 'default' }))).toContain('bg-primary');
    for (const variant of ['outline', 'secondary', 'ghost', 'link'] as const) {
      expect(tokens(buttonVariants({ variant }))).not.toContain('bg-primary');
    }
  });

  it('uses the 10px control radius', () => {
    expect(tokens(buttonVariants())).toContain('rounded-control');
  });

  it('keeps buttonVariants importable from button.tsx', () => {
    expect(ui('button.tsx')).toMatch(/export \{ Button, buttonVariants \}/);
  });
});

describe('form controls', () => {
  it.each(['input.tsx', 'textarea.tsx', 'select.tsx', 'checkbox.tsx', 'radio-group.tsx', 'switch.tsx', 'slider.tsx', 'tabs.tsx', 'input-group.tsx'])(
    '%s uses the shared focus ring', (file) => {
      expect(ui(file)).toMatch(/\bFOCUS_RING\b/);
    },
  );

  it.each(['input.tsx', 'textarea.tsx', 'select.tsx', 'checkbox.tsx', 'radio-group.tsx'])('%s draws its edge with the 3:1 input token', (file) => {
    expect(ui(file)).toMatch(/\bborder-input\b/);
  });

  it.each(['input.tsx', 'select.tsx'])('%s is a 44px touch target on phones', (file) => {
    expect(ui(file)).toMatch(/\bTOUCH_TARGET\b/);
  });

  it('tabs default to the underline style (spec §4)', () => {
    expect(ui('tabs.tsx')).toMatch(/variant = "line"/);
    expect(ui('tabs.tsx')).toMatch(/defaultVariants: \{\s*variant: "line"/);
  });

  it('no control keeps the old soft ring-3 focus', () => {
    for (const file of ['button-variants.ts', 'input.tsx', 'textarea.tsx', 'select.tsx']) expect(ui(file)).not.toMatch(/ring-3/);
  });
});

describe('tab panels (Task 16 gate: a focusable panel shows the ring)', () => {
  it('TabsContent is a tab stop (base-ui tabindex=0), so it carries the shared focus ring', () => {
    const src = ui('tabs.tsx');
    const panel = src.slice(src.indexOf('function TabsContent'), src.indexOf('export {'));
    expect(panel).toMatch(/FOCUS_RING/);
    expect(panel).toMatch(/rounded-control/);
  });
});

describe('no tinted buttons (Task 17)', () => {
  it('a disabled filled button is neutral grey with muted text, not a washed-out cobalt', () => {
    expect(tokens(buttonVariants({ variant: 'default' }))).toEqual(
      expect.arrayContaining(['disabled:bg-muted', 'disabled:text-muted-foreground', 'disabled:opacity-100']),
    );
  });

  it.each(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const)('%s has no see-through colour fill', (variant) => {
    expect(tokens(buttonVariants({ variant })).filter((c: string) => /bg-(?:primary|destructive|success|attention|info)\/[1-7]?\d$/.test(c))).toEqual([]);
  });
});
