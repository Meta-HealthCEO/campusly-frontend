// ============================================================
// Timetable Builder Types
// ============================================================

export interface PeriodTime {
  period: number;
  startTime: string;
  endTime: string;
}

export interface BreakSlot {
  afterPeriod: number;
  duration: number;
  label: string;
}

export interface PeriodsPerDay {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
}

export interface TimetableConfig {
  id: string;
  periodsPerDay: PeriodsPerDay;
  periodTimes: PeriodTime[];
  breakSlots: BreakSlot[];
  academicYear: number;
  term: number;
}

export interface TeacherAvailabilityEntry {
  day: string;
  periods: number[];
  reason?: string;
}

export interface TeacherAvailability {
  id: string;
  teacherId: string;
  teacherName?: string;
  unavailable: TeacherAvailabilityEntry[];
}

export interface TbSubjectRequirement {
  id: string;
  subjectId: string;
  subjectName?: string;
  gradeId: string;
  periodsPerWeek: number;
  requiresDoublePeriod: boolean;
  preferredTeacherId?: string;
  preferredTeacherName?: string;
}

export interface SubjectLine {
  id: string;
  gradeId: string;
  lineName: string;
  subjectIds: string[];
  subjectNames?: string[];
}

export interface LockedSlot {
  classId: string;
  day: string;
  period: number;
  subjectId: string;
  teacherId: string;
}

export interface GenerationScoreDetail {
  constraint: string;
  score: number;
}

export interface GenerationWarning {
  type: string;
  message: string;
}

export interface TbTimetableEntry {
  classId: string;
  className?: string;
  day: string;
  period: number;
  subjectId: string;
  subjectName?: string;
  teacherId: string;
  teacherName?: string;
  room?: string;
}

export interface TimetableGeneration {
  id: string;
  status: 'configuring' | 'generating' | 'completed' | 'failed';
  result: TbTimetableEntry[];
  score: { total: number; details: GenerationScoreDetail[] };
  warnings: GenerationWarning[];
  generatedAt?: string;
}
