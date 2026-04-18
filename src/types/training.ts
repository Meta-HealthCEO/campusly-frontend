import type { SportTeamRef, SportPlayer } from './sport';

export interface DrillTemplate {
  id: string;
  _id?: string;
  schoolId: string;
  name: string;
  sport?: string | null;
  focus: TrainingFocus[];
  description?: string | null;
  durationMinutes?: number | null;
  equipment: string[];
  imageUrl?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDrillTemplateInput {
  name: string;
  sport?: string;
  focus: TrainingFocus[];
  description?: string;
  durationMinutes?: number;
  equipment: string[];
  imageUrl?: string;
}

export type TrainingFocus =
  | 'fitness'
  | 'technical'
  | 'tactical'
  | 'recovery'
  | 'strength'
  | 'match_prep';

export type TrainingSessionStatus = 'scheduled' | 'completed' | 'cancelled';

export type TrainingAttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'
  | 'injured';

export interface TrainingSession {
  id: string;
  _id?: string;
  schoolId: string;
  teamId: SportTeamRef | string;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  location?: string | null;
  focus: TrainingFocus[];
  drillIds: (DrillTemplate | string)[];
  notes?: string | null;
  status: TrainingSessionStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingAttendance {
  id: string;
  _id?: string;
  schoolId: string;
  sessionId: string;
  studentId: SportPlayer | string;
  status: TrainingAttendanceStatus;
  notes?: string | null;
  rating?: number | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingSessionInput {
  teamId: string;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  location?: string;
  focus: TrainingFocus[];
  drillIds?: string[];
  notes?: string;
  status?: TrainingSessionStatus;
}

export interface UpdateTrainingSessionInput {
  title?: string;
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  location?: string;
  focus?: TrainingFocus[];
  drillIds?: string[];
  notes?: string;
  status?: TrainingSessionStatus;
}

export interface AttendanceEntry {
  studentId: string;
  status: TrainingAttendanceStatus;
  notes?: string;
  rating?: number;
}

export interface PlayerAttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  injured: number;
  attendanceRate: number;
}

export const TRAINING_FOCUS_LABELS: Record<TrainingFocus, string> = {
  fitness: 'Fitness',
  technical: 'Technical',
  tactical: 'Tactical',
  recovery: 'Recovery',
  strength: 'Strength',
  match_prep: 'Match Prep',
};

export const TRAINING_ATTENDANCE_LABELS: Record<TrainingAttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
  injured: 'Injured',
};
