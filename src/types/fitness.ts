import type { SportPlayer, SportTeamRef } from './sport';
import type { UserRef } from './injury';

export interface FitnessTestResult {
  id: string;
  _id?: string;
  schoolId: string;
  studentId: SportPlayer | string;
  teamId?: SportTeamRef | string | null;
  sportCode?: string | null;
  testType: string;
  value: number;
  unit: string;
  date: string;
  notes?: string | null;
  testedBy: UserRef | string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BiometricMeasurement {
  id: string;
  _id?: string;
  schoolId: string;
  studentId: SportPlayer | string;
  date: string;
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPct?: number | null;
  restingHrBpm?: number | null;
  notes?: string | null;
  recordedBy: UserRef | string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFitnessTestInput {
  studentId: string;
  teamId?: string;
  sportCode?: string;
  testType: string;
  value: number;
  unit: string;
  date: string;
  notes?: string;
}

export interface CreateBiometricInput {
  studentId: string;
  date: string;
  weightKg?: number;
  heightCm?: number;
  bodyFatPct?: number;
  restingHrBpm?: number;
  notes?: string;
}

export interface TestTypePreset {
  type: string;
  label: string;
  unit: string;
}

export type AgeGroup = 'U11' | 'U13' | 'U15' | 'U17' | 'U19' | 'Open';

export interface FitnessSnapshot {
  ageGroup: AgeGroup;
  bmi?: number;
  latest: Record<string, { value: number; unit: string; date: string }>;
  scores: Record<string, number>;
}

export interface AgeGroupBenchmark {
  id: string;
  _id?: string;
  schoolId?: string | null;
  sportCode: string;
  ageGroup: AgeGroup;
  testType: string;
  unit: string;
  direction: 'lower_is_better' | 'higher_is_better';
  eliteValue: number;
  goldValue: number;
  silverValue: number;
  bronzeValue: number;
  isDefault: boolean;
  isDeleted: boolean;
}

export const COMMON_FITNESS_TESTS: TestTypePreset[] = [
  { type: '40m_sprint', label: '40m sprint', unit: 'seconds' },
  { type: '20m_sprint', label: '20m sprint', unit: 'seconds' },
  { type: 'beep_test', label: 'Beep test (level)', unit: 'level' },
  { type: 'vo2_max', label: 'VO2 max', unit: 'ml/kg/min' },
  { type: 'vertical_jump', label: 'Vertical jump', unit: 'cm' },
  { type: 'broad_jump', label: 'Standing broad jump', unit: 'cm' },
  { type: 'plank_hold', label: 'Plank hold', unit: 'seconds' },
  { type: 'bench_press_1rm', label: 'Bench press 1RM', unit: 'kg' },
  { type: 'squat_1rm', label: 'Squat 1RM', unit: 'kg' },
  { type: 'deadlift_1rm', label: 'Deadlift 1RM', unit: 'kg' },
  { type: 'sit_and_reach', label: 'Sit and reach', unit: 'cm' },
  { type: 'push_ups_1min', label: 'Push-ups in 1 min', unit: 'reps' },
  { type: 'sit_ups_1min', label: 'Sit-ups in 1 min', unit: 'reps' },
  { type: 'pull_ups_max', label: 'Pull-ups max', unit: 'reps' },
];
