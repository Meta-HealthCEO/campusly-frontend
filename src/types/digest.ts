// ─── Digest Types ──────────────────────────────────────────────────────────

export type DigestChannel = 'whatsapp' | 'email' | 'both';

export interface DigestPreference {
  id: string;
  parentId: string;
  schoolId: string;
  dailyDigest: boolean;
  weeklyDigest: boolean;
  digestChannel: DigestChannel;
  morningBriefTime: string;
  eveningBriefTime: string;
}

export interface UpdateDigestPreferencesInput {
  dailyDigest?: boolean;
  weeklyDigest?: boolean;
  digestChannel?: DigestChannel;
  morningBriefTime?: string;
  eveningBriefTime?: string;
}

// ─── Morning Digest ────────────────────────────────────────────────────────

export interface TimetableEntry {
  period: number;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
}

export interface HomeworkDueEntry {
  title: string;
  subject: string;
  totalMarks: number;
}

export interface UpcomingAssessment {
  name: string;
  subject: string;
  type: string;
  date: string;
  totalMarks: number;
}

export interface DigestEvent {
  title: string;
  date: string;
  startTime: string;
  venue: string;
}

export interface MorningDigest {
  studentName: string;
  date: string;
  timetable: TimetableEntry[];
  homeworkDue: HomeworkDueEntry[];
  upcomingAssessments: UpcomingAssessment[];
  events: DigestEvent[];
  walletBalance: number;
}

// ─── Evening Digest ────────────────────────────────────────────────────────

export interface AttendanceEntry {
  period: number;
  status: string;
  notes: string;
}

export interface HomeworkAssignedEntry {
  title: string;
  subject: string;
  dueDate: string;
  totalMarks: number;
}

export interface DisciplineIncident {
  type: 'discipline';
  category: string;
  severity: string;
  description: string;
}

export interface MeritIncident {
  type: 'merit' | 'demerit';
  category: string;
  points: number;
  reason: string;
}

export type DigestIncident = DisciplineIncident | MeritIncident;

export interface EveningDigest {
  studentName: string;
  date: string;
  attendance: AttendanceEntry[];
  homeworkAssigned: HomeworkAssignedEntry[];
  incidents: DigestIncident[];
  tuckshopSpending: number;
}

// ─── Weekly Digest ─────────────────────────────────────────────────────────

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface HomeworkCompletion {
  total: number;
  submitted: number;
  rate: number;
}

export interface MarkReceived {
  mark: number;
  total: number;
  percentage: number;
  assessment: string;
}

export interface WeeklyDigest {
  studentName: string;
  weekOf: string;
  attendanceSummary: AttendanceSummary;
  homeworkCompletion: HomeworkCompletion;
  marksReceived: MarkReceived[];
  nextWeekAssessments: UpcomingAssessment[];
}
