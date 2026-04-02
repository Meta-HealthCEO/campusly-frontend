'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Subject, SchoolClass, Grade } from '@/types';

export function useLearningAcademicData() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  const fetchAcademicData = useCallback(async () => {
    const results = await Promise.allSettled([
      apiClient.get('/academic/subjects'),
      apiClient.get('/academic/classes'),
      apiClient.get('/academic/grades'),
    ]);
    if (results[0].status === 'fulfilled') {
      const raw = unwrapResponse(results[0].value);
      const arr = Array.isArray(raw) ? raw : raw.data ?? [];
      setSubjects(
        arr.map((s: Record<string, unknown>) => ({
          ...s,
          id: (s._id as string) ?? (s.id as string),
        })) as Subject[],
      );
    }
    if (results[1].status === 'fulfilled') {
      const raw = unwrapResponse(results[1].value);
      const arr = Array.isArray(raw) ? raw : raw.data ?? [];
      setClasses(
        arr.map((c: Record<string, unknown>) => ({
          ...c,
          id: (c._id as string) ?? (c.id as string),
        })) as SchoolClass[],
      );
    }
    if (results[2].status === 'fulfilled') {
      const raw = unwrapResponse(results[2].value);
      const arr = Array.isArray(raw) ? raw : raw.data ?? [];
      setGrades(
        arr.map((g: Record<string, unknown>) => ({
          ...g,
          id: (g._id as string) ?? (g.id as string),
        })) as Grade[],
      );
    }
  }, []);

  return { subjects, classes, grades, fetchAcademicData };
}
