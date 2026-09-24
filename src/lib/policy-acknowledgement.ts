/**
 * The backend's /governance/policies/pending-acknowledgements lists the active
 * policies this user has NOT acknowledged. A policy absent from it is done.
 * Null means the list hasn't loaded, so don't show a button yet.
 */
export function isPolicyAcknowledged(
  policyId: string,
  pending: ReadonlyArray<{ id: string }> | null,
): boolean | null {
  if (pending === null) return null;
  return !pending.some((p: { id: string }) => p.id === policyId);
}
