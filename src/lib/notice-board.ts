import type { PostScope } from '@/types';

/** Who a notice reaches, said under the board picker before it's posted. */
export function noticeReachLine(scope: PostScope | null, name: string): string {
  if (scope === 'class' || scope === 'grade') return `Learners in ${name} and their parents are notified.`;
  if (scope === 'school') return "It shows on everyone's notice board. No one is notified.";
  return '';
}
