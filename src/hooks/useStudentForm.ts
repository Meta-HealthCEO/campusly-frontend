import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import type { Grade, SchoolClass, Parent } from '@/types';

interface StudentFormOptions {
  grades: Grade[];
  classes: SchoolClass[];
  parents: Parent[];
  loading: boolean;
}

function normalizeId<T extends { _id?: string; id?: string }>(item: T): T & { id: string } {
  return { ...item, id: item._id ?? item.id ?? '' };
}

export function useStudentFormOptions(): StudentFormOptions {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [gradesRes, classesRes, parentsRes] = await Promise.all([
          apiClient.get('/academic/grades'),
          apiClient.get('/academic/classes'),
          apiClient.get('/parents'),
        ]);
        setGrades(unwrapList<Grade>(gradesRes).map(normalizeId));
        setClasses(unwrapList<SchoolClass>(classesRes).map(normalizeId));
        setParents(unwrapList<Parent>(parentsRes).map(normalizeId));
      } catch {
        console.error('Failed to load form options');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  return { grades, classes, parents, loading };
}

interface CreateStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  gradeId: string;
  classId: string;
  admissionNumber: string;
  guardianId?: string;
  homeLanguage?: string;
  previousSchool?: string;
  transportRequired?: boolean;
  afterCareRequired?: boolean;
}

export async function createStudent(
  data: CreateStudentPayload,
  schoolId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Create user account with role 'student'
    const tempPassword = `Campus${Date.now().toString(36)}!`;
    const userRes = await apiClient.post('/auth/register', {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: tempPassword,
      role: 'student',
      schoolId,
    });
    const userData = unwrapResponse(userRes);
    const userId = userData._id ?? userData.id ?? userData.user?._id ?? userData.user?.id;

    if (!userId) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Step 2: Create student record
    await apiClient.post('/students', {
      userId,
      schoolId,
      gradeId: data.gradeId,
      classId: data.classId,
      admissionNumber: data.admissionNumber,
      guardianIds: data.guardianId ? [data.guardianId] : [],
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : undefined,
      gender: data.gender,
      homeLanguage: data.homeLanguage || undefined,
      previousSchool: data.previousSchool || undefined,
      transportRequired: data.transportRequired ?? false,
      afterCareRequired: data.afterCareRequired ?? false,
      enrollmentDate: new Date().toISOString(),
      enrollmentStatus: 'active',
    });

    return { success: true };
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string; error?: string } } })
      ?.response?.data?.message
      ?? (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to create student';
    return { success: false, error: message };
  }
}
