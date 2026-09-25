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
