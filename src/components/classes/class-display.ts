// Display-name helpers for a teacher's class entry.

import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';

export function getGradeName(entry: TeacherClassEntry): string {
  const runtimeGradeId = (entry.class as { gradeId?: unknown }).gradeId;
  const gradeFromId = typeof runtimeGradeId === 'object' && runtimeGradeId !== null
    ? runtimeGradeId as { name?: string }
    : null;
  return entry.class.grade?.name ?? entry.class.gradeName ?? gradeFromId?.name ?? '';
}

export function getClassDisplayName(entry: TeacherClassEntry): string {
  const gradeName = getGradeName(entry).trim();
  const className = entry.class.name.trim();
  if (!gradeName || className.toLowerCase().includes(gradeName.toLowerCase())) {
    return className;
  }
  return `${gradeName} ${className}`.trim();
}
