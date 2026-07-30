import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Grade, Subject, SchoolClass } from '@/types';

export interface BulkCreateResult {
  created: number;
  failed: number;
  /** One human-readable line per failed learner, for honest UI feedback. */
  failures: string[];
}

interface CreateStudentPayload {
  firstName: string;
  lastName: string;
  gradeId: string;
  classId: string;
}

interface SchoolUpdatePayload {
  name: string;
  type: string;
  province: string;
}

// Map onboarding school types to backend-valid enum values
const SCHOOL_TYPE_MAP: Record<string, 'primary' | 'secondary' | 'combined' | 'special'> = {
  independent: 'combined',
  private: 'combined',
  government: 'combined',
};

export function useTeacherOnboarding() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const updateSchool = useCallback(async (data: SchoolUpdatePayload): Promise<void> => {
    const backendType = SCHOOL_TYPE_MAP[data.type] ?? 'combined';
    await apiClient.put(`/schools/${schoolId}`, {
      name: data.name,
      type: backendType,
      address: {
        street: 'TBD',
        city: 'TBD',
        province: data.province,
        postalCode: '0000',
        country: 'South Africa',
      },
    });
  }, [schoolId]);

  const createGrade = useCallback(async (name: string, orderIndex: number): Promise<Grade> => {
    const res = await apiClient.post('/academic/grades', { name, orderIndex, schoolId });
    return unwrapResponse<Grade>(res);
  }, [schoolId]);

  const createSubject = useCallback(async (name: string, code: string, gradeIds: string[]): Promise<Subject> => {
    const res = await apiClient.post('/academic/subjects', { name, code, gradeIds, schoolId });
    return unwrapResponse<Subject>(res);
  }, [schoolId]);

  const createClass = useCallback(async (name: string, gradeId: string): Promise<SchoolClass> => {
    const res = await apiClient.post('/academic/classes', {
      name,
      gradeId,
      schoolId,
      teacherId: user?.id,
      capacity: 200,
    });
    return unwrapResponse<SchoolClass>(res);
  }, [schoolId, user?.id]);

  const createStudent = useCallback(async (data: CreateStudentPayload): Promise<unknown> => {
    const admissionNumber = `STU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const res = await apiClient.post('/students', {
      ...data,
      schoolId,
      email: `${admissionNumber.toLowerCase()}@students.campusly.local`,
      admissionNumber,
      // Required by the backend's .strict() createStudentSchema — omitting it
      // 400'd every student during onboarding. 'slip' (printed credentials) is
      // correct here because the address above is synthetic and unroutable, so
      // an email invite would silently bounce.
      deliveryMethod: 'slip' as const,
    });
    return unwrapResponse(res);
  }, [schoolId]);

  const bulkCreateStudents = useCallback(
    async (students: CreateStudentPayload[]): Promise<BulkCreateResult> => {
      let created = 0;
      const failures: string[] = [];
      for (const student of students) {
        const name = `${student.firstName} ${student.lastName}`.trim();
        try {
          await createStudent(student);
          created++;
        } catch (err: unknown) {
          failures.push(`${name}: ${extractErrorMessage(err, 'could not be added')}`);
        }
      }
      return { created, failed: failures.length, failures };
    },
    [createStudent],
  );

  return { updateSchool, createGrade, createSubject, createClass, createStudent, bulkCreateStudents };
}
