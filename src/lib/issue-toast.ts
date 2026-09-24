import { gradebookHref, type GradebookLink } from '@/lib/gradebook-link';

export interface IssuedMessage {
  title: string;
  description?: string;
  href: string | null;
}

/** What to tell the teacher after issuing a mark, and where "View in gradebook" goes. */
export function issuedMessage(marking: { studentName?: string; gradebook?: GradebookLink | null }): IssuedMessage {
  if (!marking.gradebook) return { title: 'Marking issued', description: undefined, href: null };
  return {
    title: 'Mark saved to the gradebook',
    description: marking.studentName ? `${marking.studentName}'s mark is in the gradebook.` : undefined,
    href: gradebookHref(marking.gradebook),
  };
}
