import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { recipientsFromStudent, type RecipientOption } from '@/lib/message-recipients';

/**
 * Look up messaging recipients for a given student.
 * - Teacher calling → returns the student's parents
 * - Parent calling → returns the student's teachers (via class assignments)
 */
export function useRecipientLookup(userRole: string) {
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [loading, setLoading] = useState(false);

  const lookupForStudent = useCallback(async (studentId: string) => {
    if (!studentId) {
      setRecipients([]);
      return;
    }
    setLoading(true);
    try {
      if (userRole === 'teacher') {
        // The learner's parents (GET /students/:id returns them as guardianIds).
        const res = await apiClient.get(`/students/${studentId}`);
        setRecipients(recipientsFromStudent(unwrapResponse<Record<string, unknown>>(res)));
      } else {
        // Parent: get student's teachers via class
        const res = await apiClient.get(`/students/${studentId}`);
        const raw = unwrapResponse<Record<string, unknown>>(res);
        const classId = (raw.classId as string)
          ?? ((raw.classId as Record<string, unknown>)?._id as string)
          ?? '';
        if (classId) {
          const classRes = await apiClient.get(`/academic/classes/${classId}`);
          const classData = unwrapResponse<Record<string, unknown>>(classRes);
          const teachers: RecipientOption[] = [];
          // Class teacher
          const ct = classData.classTeacher as Record<string, unknown> | string | undefined;
          if (ct && typeof ct === 'object') {
            const tid = (ct._id as string) ?? (ct.id as string) ?? '';
            const tname = `${(ct.firstName as string) ?? ''} ${(ct.lastName as string) ?? ''}`.trim();
            if (tid) teachers.push({ id: tid, name: tname || 'Class Teacher', role: 'teacher' });
          } else if (typeof ct === 'string') {
            teachers.push({ id: ct, name: 'Class Teacher', role: 'teacher' });
          }
          // Subject teachers if available
          const subjectTeachers = (classData.teachers ?? classData.subjectTeachers ?? []) as Array<Record<string, unknown> | string>;
          for (const t of subjectTeachers) {
            if (typeof t === 'string') {
              if (!teachers.some((x) => x.id === t)) {
                teachers.push({ id: t, name: 'Teacher', role: 'teacher' });
              }
            } else {
              const tid = (t._id as string) ?? (t.id as string) ?? '';
              const tname = `${(t.firstName as string) ?? ''} ${(t.lastName as string) ?? ''}`.trim();
              if (tid && !teachers.some((x) => x.id === tid)) {
                teachers.push({ id: tid, name: tname || 'Teacher', role: 'teacher' });
              }
            }
          }
          setRecipients(teachers);
        } else {
          setRecipients([]);
        }
      }
    } catch {
      console.error('Failed to look up recipients');
      setRecipients([]);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  return { recipients, loading, lookupForStudent };
}
