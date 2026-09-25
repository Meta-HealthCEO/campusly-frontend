import { describe, expect, it } from 'vitest';
import { readSource } from './support/source';

const ui = (file: string) => readSource(`src/components/ui/${file}`);

describe('overlays (spec §2.4: popovers and dialogs share the overlay shadow; 16px dialogs, 10px menus)', () => {
  it.each(['dialog.tsx', 'sheet.tsx'])('%s is a 16px surface with the overlay shadow', (file) => {
    expect(ui(file)).toMatch(/rounded(-t)?-card/);
    expect(ui(file)).toMatch(/shadow-overlay/);
  });

  it.each(['popover.tsx', 'dropdown-menu.tsx', 'select.tsx', 'command.tsx', 'tooltip.tsx'])('%s is a 10px surface', (file) => {
    expect(ui(file)).toMatch(/rounded-control/);
  });

  it.each(['popover.tsx', 'dropdown-menu.tsx', 'select.tsx'])('%s uses the overlay shadow, not a stock one', (file) => {
    expect(ui(file)).toMatch(/shadow-overlay/);
    expect(ui(file)).not.toMatch(/shadow-(md|lg)\b/);
  });

  it.each(['dialog.tsx', 'sheet.tsx', 'popover.tsx', 'dropdown-menu.tsx', 'select.tsx'])('%s has no stock foreground ring for an edge', (file) => {
    expect(ui(file)).not.toMatch(/ring-foreground\/10/);
  });

  it('panels move on the 250ms standard curve', () => {
    expect(ui('sheet.tsx')).toMatch(/duration-250/);
    expect(ui('sheet.tsx')).toMatch(/ease-standard/);
  });

  it('a bottom sheet keeps clear of the phone home bar', () => {
    expect(ui('sheet.tsx')).toMatch(/pb-\[env\(safe-area-inset-bottom\)\]/);
  });

  it('toasts use the tokens', () => {
    expect(ui('sonner.tsx')).toMatch(/shadow-overlay/);
  });
});
