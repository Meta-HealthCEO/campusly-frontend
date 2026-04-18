import type { SportTeamRef } from './sport';
import type { UserRef } from './injury';

export const TEAM_ANNOUNCEMENT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TeamAnnouncementPriority = (typeof TEAM_ANNOUNCEMENT_PRIORITIES)[number];

export interface TeamAnnouncement {
  id: string;
  _id?: string;
  schoolId: string;
  teamId: SportTeamRef | string;
  authorId: UserRef | string;
  title: string;
  body: string;
  priority: TeamAnnouncementPriority;
  pinned: boolean;
  publishedAt: string;
  expiresAt?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamAnnouncementInput {
  teamId: string;
  title: string;
  body: string;
  priority?: TeamAnnouncementPriority;
  pinned?: boolean;
  publishedAt?: string;
  expiresAt?: string;
}

export interface UpdateTeamAnnouncementInput {
  title?: string;
  body?: string;
  priority?: TeamAnnouncementPriority;
  pinned?: boolean;
  publishedAt?: string;
  expiresAt?: string;
}

export const TEAM_PRIORITY_LABELS: Record<TeamAnnouncementPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};
