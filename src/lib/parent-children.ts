import type { Student, User } from '@/types';

type RawChild = Omit<Student, 'userId'> & {
  _id?: string;
  userId: string | (User & { _id?: string; id?: string });
  className?: string;
  gradeName?: string;
};

/**
 * A child from GET /parents/me. The API fills in userId with the learner's user (their name),
 * while the app reads names from `user` and expects userId to be an id — so move it across.
 */
export function studentFromParentRecord(raw: RawChild): Student {
  const filledIn = typeof raw.userId === 'object' && raw.userId !== null ? raw.userId : null;
  return {
    ...raw,
    id: raw._id ?? raw.id,
    userId: filledIn ? String(filledIn._id ?? filledIn.id ?? '') : raw.userId,
    user: raw.user ?? (filledIn as User | null) ?? raw.user,
    // The API sends the names beside the ids; the app reads them from grade/class.
    grade: raw.grade ?? (raw.gradeName ? ({ name: raw.gradeName } as Student['grade']) : raw.grade),
    class: raw.class ?? (raw.className ? ({ name: raw.className } as Student['class']) : raw.class),
  } as Student;
}

/** "Grade 1 - A" alone when the class name already says the grade; otherwise "Grade 1 · 1A". */
export function childClassLine(gradeName: string, className: string): string {
  if (!gradeName) return className;
  if (!className) return gradeName;
  return className.toLowerCase().includes(gradeName.toLowerCase()) ? className : `${gradeName} · ${className}`;
}
