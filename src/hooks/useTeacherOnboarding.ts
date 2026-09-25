import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { capsFrameworkId } from '@/lib/onboarding';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CurriculumFrameworkItem, SchoolClass } from '@/types';

/** A school Grade or Subject row, with the CAPS node it was made from. */
export interface LinkedSchoolRow {
  id: string;
  name: string;
  curriculumNodeId: string | null;
}

export interface CreatedClass {
  id: string;
  name: string;
  classroomCode: string;
}

const toLinked = (row: { id: string; name: string; curriculumNodeId?: string | null }): LinkedSchoolRow => ({
  id: row.id,
  name: row.name,
  curriculumNodeId: row.curriculumNodeId ?? null,
});

/** API calls for the standalone teacher onboarding (what you teach → first class → first lesson). */
export function useTeacherOnboarding() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  /** The CAPS framework the scope picker reads its phases, grades and subjects from. */
  const loadCapsFrameworkId = useCallback(async (): Promise<string | null> => {
    const res = await apiClient.get('/curriculum-structure/frameworks');
    const list = unwrapResponse<CurriculumFrameworkItem[]>(res);
    return capsFrameworkId(Array.isArray(list) ? list : []);
  }, []);

  /** The school Grade and Subject rows saving the teaching scope created. */
  const loadSchoolRows = useCallback(async (): Promise<{ grades: LinkedSchoolRow[]; subjects: LinkedSchoolRow[] }> => {
    const [gradesRes, subjectsRes] = await Promise.all([
      apiClient.get('/academic/grades', { params: { limit: 100 } }),
      apiClient.get('/academic/subjects', { params: { limit: 200 } }),
    ]);
    type Row = { id: string; name: string; curriculumNodeId?: string | null };
    return {
      grades: unwrapList<Row>(gradesRes).map(toLinked),
      subjects: unwrapList<Row>(subjectsRes).map(toLinked),
    };
  }, []);

  /** A class the teacher teaches this subject to; the subject makes it show up in the lesson builder. */
  const createClass = useCallback(async (name: string, gradeId: string, subjectId: string): Promise<CreatedClass> => {
    const res = await apiClient.post('/academic/classes', {
      name,
      gradeId,
      subjectId,
      schoolId,
      teacherId: user?.id,
      capacity: 200,
    });
    const cls = unwrapResponse<SchoolClass & { classroomCode?: string }>(res);
    return { id: cls.id, name: cls.name, classroomCode: cls.classroomCode ?? '' };
  }, [schoolId, user?.id]);

  return { loadCapsFrameworkId, loadSchoolRows, createClass };
}
