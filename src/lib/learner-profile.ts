import type { LearnerProfileData } from '@/types/student-360';

export type LearnerStatKey = 'average' | 'attendance' | 'homework' | 'merits';

export interface LearnerStat {
  key: LearnerStatKey;
  title: string;
  value: string;
  description: string;
}

export function teacherLearnerProfilePath(studentId: string): string {
  return `/teacher/students/${encodeURIComponent(studentId)}`;
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? `1 ${one}` : `${n} ${many}`);

export function learnerQuickStats(profile: LearnerProfileData): LearnerStat[] {
  const { academic, attendance, homework, achievements } = profile;
  const registers = attendance.present + attendance.absent + attendance.late + attendance.excused;
  return [
    academic.subjects.length === 0
      ? { key: 'average', title: 'Term average', value: '—', description: 'No marks yet' }
      : {
          key: 'average', title: 'Term average', value: `${Math.round(academic.termAverage)}%`,
          description: plural(academic.subjects.length, 'subject', 'subjects'),
        },
    registers === 0
      ? { key: 'attendance', title: 'Attendance', value: '—', description: 'No registers yet' }
      : {
          key: 'attendance', title: 'Attendance', value: `${Math.round(attendance.percentage)}%`,
          description: plural(attendance.absent, 'day absent', 'days absent'),
        },
    {
      key: 'homework', title: 'Homework done', value: String(homework.completed),
      description: homework.pending === 0 ? 'Nothing outstanding' : `${homework.pending} still to hand in`,
    },
    {
      key: 'merits', title: 'Merits', value: String(achievements.totalMerits),
      description: plural(achievements.totalDemerits, 'demerit', 'demerits'),
    },
  ];
}
