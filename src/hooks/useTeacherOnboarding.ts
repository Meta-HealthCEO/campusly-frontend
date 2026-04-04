import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Grade, Subject } from '@/types';

interface CreateStudentPayload {
  firstName: string;
  lastName: string;
  gradeId: string;
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

  const createStudent = useCallback(async (data: CreateStudentPayload): Promise<unknown> => {
    const res = await apiClient.post('/students', {
      ...data,
      schoolId,
      email: `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@placeholder.campusly`,
      dateOfBirth: '2010-01-01',
      gender: 'other',
      admissionNumber: `STU-${Date.now()}`,
    });
    return unwrapResponse(res);
  }, [schoolId]);

  const bulkCreateStudents = useCallback(async (students: CreateStudentPayload[]): Promise<number> => {
    let created = 0;
    for (const student of students) {
      try {
        await createStudent(student);
        created++;
      } catch {
        console.error(`Failed to create student: ${student.firstName} ${student.lastName}`);
      }
    }
    return created;
  }, [createStudent]);

  return { updateSchool, createGrade, createSubject, createStudent, bulkCreateStudents };
}
