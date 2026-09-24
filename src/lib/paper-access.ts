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

type PaperCreator = string | { _id?: string; id?: string; firstName?: string; lastName?: string } | null | undefined;

/** Whether this user wrote the paper (createdBy may be an id or populated). */
export function isPaperAuthor(createdBy: PaperCreator, userId: string | null | undefined): boolean {
  if (!userId) return false;
  const authorId = typeof createdBy === 'string' ? createdBy : createdBy?._id ?? createdBy?.id ?? '';
  return authorId === userId;
}

/**
 * Whether this user may change a paper (questions, memo, submit, finalise):
 * its author, or a school admin or principal. An HOD reviewing a colleague's
 * paper can read it but not change it (the server enforces the same).
 */
export function canEditPaper(
  createdBy: PaperCreator,
  user: { id: string; role: string; isSchoolPrincipal?: boolean } | null | undefined,
): boolean {
  if (!user) return false;
  // The auth store maps school_admin to 'admin'; accept both spellings.
  if (['admin', 'school_admin', 'super_admin'].includes(user.role) || user.isSchoolPrincipal) return true;
  return isPaperAuthor(createdBy, user.id);
}
