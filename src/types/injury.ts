import type { SportPlayer, SportTeamRef } from './sport';

export const INJURY_BODY_PARTS = [
  'head', 'neck', 'shoulder', 'arm', 'elbow', 'wrist', 'hand',
  'chest', 'back', 'hip', 'groin', 'thigh', 'hamstring', 'quadriceps',
  'knee', 'calf', 'shin', 'ankle', 'foot', 'other',
] as const;

export const INJURY_TYPES = [
  'sprain', 'strain', 'fracture', 'contusion', 'laceration',
  'concussion', 'overuse', 'dislocation', 'other',
] as const;

export const INJURY_SEVERITIES = ['minor', 'moderate', 'severe'] as const;

export const INJURY_STATUSES = ['active', 'recovering', 'cleared', 'closed'] as const;

export const CLEARANCE_LEVELS = [
  'none', 'light_training', 'full_training', 'match_ready',
] as const;

export type InjuryBodyPart = (typeof INJURY_BODY_PARTS)[number];
export type InjuryType = (typeof INJURY_TYPES)[number];
export type InjurySeverity = (typeof INJURY_SEVERITIES)[number];
export type InjuryStatus = (typeof INJURY_STATUSES)[number];
export type ClearanceLevel = (typeof CLEARANCE_LEVELS)[number];

export interface UserRef {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface InjuryRecord {
  id: string;
  _id?: string;
  schoolId: string;
  studentId: SportPlayer | string;
  teamId?: SportTeamRef | string | null;
  injuryDate: string;
  bodyPart: InjuryBodyPart;
  type: InjuryType;
  severity: InjurySeverity;
  mechanism?: string | null;
  description?: string | null;
  expectedReturnDate?: string | null;
  actualReturnDate?: string | null;
  status: InjuryStatus;
  clearanceLevel: ClearanceLevel;
  reportedBy: UserRef | string;
  clearedBy?: UserRef | string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryLog {
  id: string;
  _id?: string;
  schoolId: string;
  injuryId: string;
  loggedBy: UserRef | string;
  date: string;
  painLevel?: number | null;
  mobilityScore?: number | null;
  activitiesPerformed: string[];
  notes?: string | null;
  nextMilestone?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInjuryInput {
  studentId: string;
  teamId?: string;
  injuryDate: string;
  bodyPart: InjuryBodyPart;
  type: InjuryType;
  severity: InjurySeverity;
  mechanism?: string;
  description?: string;
  expectedReturnDate?: string;
}

export interface UpdateInjuryInput {
  injuryDate?: string;
  bodyPart?: InjuryBodyPart;
  type?: InjuryType;
  severity?: InjurySeverity;
  mechanism?: string;
  description?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  status?: InjuryStatus;
  clearanceLevel?: ClearanceLevel;
}

export interface CreateRecoveryLogInput {
  date: string;
  painLevel?: number;
  mobilityScore?: number;
  activitiesPerformed: string[];
  notes?: string;
  nextMilestone?: string;
}

export const BODY_PART_LABELS: Record<InjuryBodyPart, string> = {
  head: 'Head', neck: 'Neck', shoulder: 'Shoulder', arm: 'Arm',
  elbow: 'Elbow', wrist: 'Wrist', hand: 'Hand', chest: 'Chest',
  back: 'Back', hip: 'Hip', groin: 'Groin', thigh: 'Thigh',
  hamstring: 'Hamstring', quadriceps: 'Quadriceps', knee: 'Knee',
  calf: 'Calf', shin: 'Shin', ankle: 'Ankle', foot: 'Foot', other: 'Other',
};

export const INJURY_TYPE_LABELS: Record<InjuryType, string> = {
  sprain: 'Sprain', strain: 'Strain', fracture: 'Fracture',
  contusion: 'Contusion', laceration: 'Laceration',
  concussion: 'Concussion', overuse: 'Overuse', dislocation: 'Dislocation',
  other: 'Other',
};

export const SEVERITY_LABELS: Record<InjurySeverity, string> = {
  minor: 'Minor', moderate: 'Moderate', severe: 'Severe',
};

export const STATUS_LABELS: Record<InjuryStatus, string> = {
  active: 'Active', recovering: 'Recovering',
  cleared: 'Cleared', closed: 'Closed',
};

export const CLEARANCE_LABELS: Record<ClearanceLevel, string> = {
  none: 'Not cleared',
  light_training: 'Light training',
  full_training: 'Full training',
  match_ready: 'Match ready',
};
