'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Student } from '@/types';

export interface StudentProfileFormData {
  // User-record fields
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  // Student-record fields
  admissionNumber: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  saIdNumber?: string;
  luritsNumber?: string;
  previousSchool?: string;
  homeLanguage?: string;
  additionalLanguages?: string[];
  transportRequired?: boolean;
  afterCareRequired?: boolean;
  enrollmentStatus?: 'active' | 'transferred' | 'graduated' | 'expelled' | 'withdrawn';
}

function normaliseStudentUpdatePayload(
  data: Partial<StudentProfileFormData>,
): Partial<StudentProfileFormData> {
  const payload: Partial<StudentProfileFormData> = { ...data };
  if (typeof payload.dateOfBirth === 'string') {
    const trimmed = payload.dateOfBirth.trim();
    payload.dateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? new Date(`${trimmed}T00:00:00.000Z`).toISOString()
      : trimmed || undefined;
  }
  return payload;
}

export function useStudentEditor(studentId: string | null) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStudent = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/students/${studentId}`);
      setStudent(unwrapResponse<Student>(res));
    } catch {
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const updateStudent = useCallback(
    async (data: Partial<StudentProfileFormData>): Promise<Student | null> => {
      if (!studentId) return null;
      const res = await apiClient.put(`/students/${studentId}`, normaliseStudentUpdatePayload(data));
      const updated = unwrapResponse<Student>(res);
      setStudent(updated);
      return updated;
    },
    [studentId],
  );

  useEffect(() => {
    void fetchStudent();
  }, [fetchStudent]);

  return { student, loading, refetch: fetchStudent, updateStudent };
}
