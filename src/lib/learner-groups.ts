import type { StudentClass } from '@/hooks/useStudentClasses';

export interface LearnerGroup { id: string; name: string; teacher: string; subject: string | null }

/** A learner's groups for Profile: their own group first, then the ones they joined, each once. */
export function learnerGroups(homeroom: StudentClass | null, subjectClasses: StudentClass[]): LearnerGroup[] {
  const seen = new Set<string>();
  const unique: StudentClass[] = [];
  for (const c of [homeroom, ...subjectClasses]) {
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    unique.push(c);
  }
  return unique.map((c: StudentClass) => ({
    id: c.id,
    name: c.name,
    teacher: `${c.teacher.firstName} ${c.teacher.lastName}`.trim(),
    subject: c.subject?.name ?? null,
  }));
}
