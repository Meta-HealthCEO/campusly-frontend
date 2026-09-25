import { useSyncExternalStore } from 'react';

const noSubscription = () => () => {};

/**
 * False in the server HTML and until React has hydrated, true after. A form
 * whose submit waits for this can't be submitted natively (as a GET with the
 * password in the URL) before its handlers are attached (spec §3).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}
