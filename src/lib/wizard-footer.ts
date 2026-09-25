/**
 * Where the wizard's Back/Next bar sits. On a phone it spans the screen just
 * above the bottom nav (which would otherwise cover it); from lg up it floats
 * beside the sidebar as before.
 */
export function wizardFooterPlacement(sidebarCollapsed: boolean): { outer: string; inner: string } {
  return {
    outer: [
      'pointer-events-none fixed left-0 right-0 bottom-20 z-40 flex justify-center px-3',
      'lg:bottom-6 lg:px-6',
      sidebarCollapsed ? 'lg:left-17.5' : 'lg:left-64',
    ].join(' '),
    inner: 'pointer-events-auto w-full max-w-160 rounded-2xl border bg-background/95 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80 lg:w-1/3 lg:min-w-110',
  };
}
