import type { FreeAllowance } from '@/types/subscription';

export interface PaperGenerationAccess {
  allowed: boolean;
  /** Free papers left; null when the teacher isn't on the free allowance. */
  freeRemaining: number | null;
  freeLimit: number | null;
}

/**
 * Pro (and school-tier) teachers can always generate. Free independent
 * teachers can while their free AI papers last. With no allowance data, fail
 * closed — the backend enforces the same rule either way.
 */
export function paperGenerationAccess(
  entitled: boolean,
  allowance: FreeAllowance | null,
): PaperGenerationAccess {
  if (entitled) return { allowed: true, freeRemaining: null, freeLimit: null };
  if (!allowance) return { allowed: false, freeRemaining: null, freeLimit: null };
  const { remaining, limit } = allowance.paperGenerations;
  return { allowed: remaining > 0, freeRemaining: remaining, freeLimit: limit };
}
