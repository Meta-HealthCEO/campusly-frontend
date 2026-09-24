import type { ConferenceBookingLearner } from '@/types';

/** A booked learner's name: from their user (how the API sends it), else from the learner, else "Learner". */
export function learnerName(learner: ConferenceBookingLearner | null | undefined): string {
  const first = learner?.userId?.firstName ?? learner?.firstName ?? '';
  const last = learner?.userId?.lastName ?? learner?.lastName ?? '';
  return `${first} ${last}`.trim() || 'Learner';
}
