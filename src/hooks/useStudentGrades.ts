import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useCurrentStudent } from './useCurrentStudent';
import type { StudentGrade, Subject } from '@/types';

interface StudentGradesResult {
  grades: StudentGrade[];
  subjects: Subject[];
  loading: boolean;
}

export function useStudentGrades(): StudentGradesResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) {
      if (!studentLoading) setLoading(false);
      return;
    }

    const currentStudent = student;
    async function fetchData() {
      try {
        const sid = currentStudent._id ?? currentStudent.id;
        const [marksRes, subjectsRes] = await Promise.allSettled([
          apiClient.get(`/academic/marks/student/${sid}`),
          apiClient.get('/academic/subjects'),
        ]);

        if (marksRes.status === 'fulfilled' && marksRes.value.data) {
          const arr = unwrapList<StudentGrade>(marksRes.value);
          if (arr.length > 0) setGrades(arr);
        }
        if (subjectsRes.status === 'fulfilled' && subjectsRes.value.data) {
          const arr = unwrapList<Subject>(subjectsRes.value);
          if (arr.length > 0) setSubjects(arr);
        }
      } catch {
        console.error('Failed to load grades');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [student, studentLoading]);

  return { grades, subjects, loading: studentLoading || loading };
}
