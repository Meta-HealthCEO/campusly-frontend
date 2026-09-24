/** Days of leave left: the API's figure when it sends one, else entitlement less days used and days awaiting approval. */
export function leaveRemaining(b: { entitlement: number; used: number; pending: number; remaining?: number }): number {
  if (typeof b.remaining === 'number') return b.remaining;
  return Math.max(0, b.entitlement - b.used - b.pending);
}
