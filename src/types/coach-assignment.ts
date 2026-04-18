import type { SportTeamRef } from './sport';
import type { UserRef } from './injury';

export const COACH_ROLES = [
  'head_coach',
  'assistant_coach',
  'manager',
  'physio',
] as const;
export type CoachRole = (typeof COACH_ROLES)[number];

export interface CoachAssignment {
  id: string;
  _id?: string;
  schoolId: string;
  userId: UserRef | string;
  teamId: SportTeamRef | string;
  role: CoachRole;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCoachAssignmentInput {
  userId: string;
  teamId: string;
  role?: CoachRole;
  isActive?: boolean;
}

export const COACH_ROLE_LABELS: Record<CoachRole, string> = {
  head_coach: 'Head coach',
  assistant_coach: 'Assistant coach',
  manager: 'Manager',
  physio: 'Physio',
};
