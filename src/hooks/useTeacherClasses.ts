import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Student, SchoolClass } from '@/types';

export function useTeacherClasses() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [classesRes, studentsRes] = await Promise.allSettled([
          apiClient.get('/academic/classes'),
          apiClient.get('/students'),
        ]);
        if (classesRes.status === 'fulfilled') {
          const arr = unwrapList<SchoolClass>(classesRes.value);
          if (arr.length > 0) setClasses(arr);
        }
        if (studentsRes.status === 'fulfilled') {
          const arr = unwrapList<Student>(studentsRes.value);
          if (arr.length > 0) setStudents(arr);
        }
      } catch {
        console.error('Failed to load classes');
      }
    }
    fetchData();
  }, []);

  return { classes, students };
}
