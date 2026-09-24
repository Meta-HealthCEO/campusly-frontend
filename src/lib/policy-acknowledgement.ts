/**
 * The backend's /governance/policies/pending-acknowledgements lists the active
 * policies this user has NOT acknowledged. A policy absent from it is done.
 * Null means "don't show a button": the list hasn't loaded, or the policy
 * isn't active (only active policies are tracked, so absence proves nothing).
 */
export function isPolicyAcknowledged(
  policyId: string,
  pending: ReadonlyArray<{ id: string }> | null,
  status: string = 'active',
): boolean | null {
  if (pending === null || status !== 'active') return null;
  return !pending.some((p: { id: string }) => p.id === policyId);
}
