export type TodayItem =
  | { kind: 'homework'; id: string; title: string; subject: string; dueDate: string }
  | { kind: 'lesson'; id: string; title: string; subject: string; scheduledDate: string };
// Papers excluded — GeneratedPaper has no scheduled-for-date field.

export interface GradingItem {
  kind: 'homework'; // MVP: papers deferred
  id: string;
  title: string;
  subject: string;
  totalSubmissions: number;
  gradedCount: number;
  oldestSubmittedAt: string;
}

export interface DraftItem {
  kind: 'lesson'; // MVP: only lessons have a draft state in the model
  id: string;
  title: string;
  updatedAt: string;
}

export interface TeacherHomeData {
  today: TodayItem[];
  todayTotal: number;
  grading: GradingItem[];
  gradingTotal: number;
  drafts: DraftItem[];
  draftsTotal: number;
  loading: boolean;
}
