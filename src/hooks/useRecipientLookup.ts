import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

interface RecipientOption {
  id: string;
  name: string;
  role: string;
}

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
        // Get student's parents
        const res = await apiClient.get(`/students/${studentId}`);
        const raw = unwrapResponse<Record<string, unknown>>(res);
        const parentIds = (raw.parentIds ?? raw.parents ?? []) as Array<Record<string, unknown> | string>;
        const mapped: RecipientOption[] = parentIds.map((p) => {
          if (typeof p === 'string') {
            return { id: p, name: 'Parent', role: 'parent' };
          }
          const userId = (p.userId as string) ?? (p._id as string) ?? (p.id as string) ?? '';
          // parentIds may be populated with parent records whose userId is the User record
          const userObj = p.userId as Record<string, unknown> | string | undefined;
          let name = '';
          let uid = '';
          if (userObj && typeof userObj === 'object') {
            uid = (userObj._id as string) ?? (userObj.id as string) ?? '';
            name = `${(userObj.firstName as string) ?? ''} ${(userObj.lastName as string) ?? ''}`.trim();
          } else {
            uid = userId;
            name = `${(p.firstName as string) ?? ''} ${(p.lastName as string) ?? ''}`.trim() || 'Parent';
          }
          return { id: uid, name, role: 'parent' };
        }).filter((r) => r.id);
        setRecipients(mapped);
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
