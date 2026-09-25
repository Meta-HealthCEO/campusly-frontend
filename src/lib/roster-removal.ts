// "Remove from this group" on a teacher's roster (learner-portal plan, task A9 / C8).
//
// DELETE /students/:id?classId=<group>:
// - backend with A9: takes the learner out of that group only and answers
//   { removed: 'group' }; a learner in no other group is deleted as before
//   and it answers { removed: 'learner' }.
// - backend without A9: ignores classId and deletes the learner as it always
//   has (a learner there is only ever in one group), answering no data.
import { resolveId } from './api-helpers';
import type { PopulatedId } from '@/types';

export type RemovalOutcome = 'group' | 'learner';

export interface RemoveFromGroupRequest {
  url: string;
  config: { params: { classId: string } };
}

/** The request that takes one learner out of one group. */
export function removeFromGroupRequest(studentId: string, classId: string): RemoveFromGroupRequest {
  return { url: `/students/${studentId}`, config: { params: { classId } } };
}

/** What the server did; anything but { removed: 'group' } means the learner was removed entirely. */
export function removalOutcome(data: unknown): RemovalOutcome {
  if (data && typeof data === 'object' && (data as { removed?: unknown }).removed === 'group') return 'group';
  return 'learner';
}

interface RosterGroup {
  class: PopulatedId;
  students: ReadonlyArray<{ id: string }>;
}

/** Whether the learner is also on another of the teacher's groups (from the teaching load already loaded). */
export function isInAnotherGroup(groups: ReadonlyArray<RosterGroup>, studentId: string, classId: string): boolean {
  return groups.some((group: RosterGroup) => resolveId(group.class) !== classId
    && group.students.some((s: { id: string }) => s.id === studentId));
}

export interface RemoveFromGroupCopy {
  title: string;
  description: string;
  confirmLabel: string;
}

interface CopyInput {
  name: string;
  groupName: string;
  learnerLabel: string;
  inOtherGroups: boolean;
  /** A portal learner has a sign-in that a full removal switches off. */
  hasLogin: boolean;
}

/** The confirm dialog: what removing this learner from this group will do. */
export function removeFromGroupCopy({ name, groupName, learnerLabel, inOtherGroups, hasLogin }: CopyInput): RemoveFromGroupCopy {
  const title = `Remove ${name} from ${groupName}?`;
  if (inOtherGroups) {
    return { title, description: 'They stay in your other groups.', confirmLabel: 'Remove from this group' };
  }
  const signIn = hasLogin ? ' and can no longer sign in' : '';
  return {
    title,
    description: `This is their only group with you, so they are removed from Campusly${signIn}.`,
    confirmLabel: `Remove ${learnerLabel.toLowerCase()}`,
  };
}

/** The toast after the server answered. */
export function removedToast(name: string, groupName: string, outcome: RemovalOutcome): string {
  return outcome === 'group' ? `${name} removed from ${groupName}` : `${name} removed`;
}
