/**
 * Where the wizard's Back/Next bar sits. On a phone it spans the screen just above the bottom nav;
 * from md it floats beside the 56px rail, and from lg beside the 232px sidebar (or the rail when collapsed).
 */
export function wizardFooterPlacement(sidebarCollapsed: boolean): { outer: string; inner: string } {
  return {
    outer: [
      'pointer-events-none fixed left-0 right-0 bottom-20 z-40 flex justify-center px-3',
      'md:bottom-6 md:left-14 md:px-6',
      sidebarCollapsed ? 'lg:left-14' : 'lg:left-[232px]',
    ].join(' '),
    inner: 'pointer-events-auto w-full max-w-160 rounded-card border border-border bg-card/95 shadow-overlay backdrop-blur supports-backdrop-filter:bg-card/80 lg:w-1/3 lg:min-w-110',
  };
}
