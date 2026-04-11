import { useEffect } from 'react';

/**
 * Warns the user before leaving a page with unsaved changes.
 *
 * - Hooks into `beforeunload` to cover tab close / reload / external nav.
 * - Does NOT guard in-app Next.js navigation (App Router intentionally
 *   doesn't expose a route-change blocker yet). For in-app nav, callers
 *   should prompt via their own UI when relevant actions fire.
 *
 * @param isDirty Whether the page has unsaved changes right now.
 * @param message Optional custom message (most browsers ignore it).
 */
export function useUnsavedChanges(isDirty: boolean, message?: string): void {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for some browsers to trigger the native prompt.
      e.returnValue = message ?? '';
      return message ?? '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, message]);
}
