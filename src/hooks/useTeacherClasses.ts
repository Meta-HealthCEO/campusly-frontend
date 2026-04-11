import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Student, SchoolClass } from '@/types';

export function useTeacherClasses() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [classesRes, studentsRes] = await Promise.allSettled([
        apiClient.get('/academic/classes'),
        apiClient.get('/students'),
      ]);
      if (classesRes.status === 'fulfilled') {
        setClasses(unwrapList<SchoolClass>(classesRes.value));
      } else {
        console.error('Failed to load classes', classesRes.reason);
        toast.error('Could not load classes. Please refresh.');
      }
      if (studentsRes.status === 'fulfilled') {
        setStudents(unwrapList<Student>(studentsRes.value));
      } else {
        console.error('Failed to load students', studentsRes.reason);
        toast.error('Could not load students. Please refresh.');
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return { classes, students, loading };
}
