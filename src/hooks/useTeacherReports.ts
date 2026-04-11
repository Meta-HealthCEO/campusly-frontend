import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

interface ClassOption {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  name: string;
  admissionNumber: string;
}

export function useTeacherReportData() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await apiClient.get('/academic/classes');
        const arr = unwrapList<Record<string, unknown>>(response);
        setClasses(
          arr.map((c) => ({
            id: (c.id as string) ?? '',
            name: (c.name as string) ?? 'Unknown',
          })),
        );
      } catch (err: unknown) {
        console.error('Failed to load classes', err);
        toast.error('Could not load classes. Please refresh.');
      }
    }
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }
    async function fetchStudents() {
      setLoadingStudents(true);
      try {
        const response = await apiClient.get('/students', {
          params: { classId: selectedClass },
        });
        const arr = unwrapList<Record<string, unknown>>(response);
        setStudents(
          arr.map((s) => {
            const userId = s.userId as Record<string, unknown> | undefined;
            const firstName = (userId?.firstName as string) ?? '';
            const lastName = (userId?.lastName as string) ?? '';
            return {
              id: (s.id as string) ?? '',
              name:
                `${firstName} ${lastName}`.trim() ||
                (s.admissionNumber as string) ||
                'Unknown',
              admissionNumber: (s.admissionNumber as string) ?? '',
            };
          }),
        );
      } catch (err: unknown) {
        console.error('Failed to load students', err);
        toast.error('Could not load students. Please refresh.');
      } finally {
        setLoadingStudents(false);
      }
    }
    fetchStudents();
  }, [selectedClass]);

  return {
    classes,
    students,
    selectedClass,
    setSelectedClass,
    loadingStudents,
  };
}

export type { ClassOption, StudentOption };
