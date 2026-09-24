import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { mapStudentHistory, type MarkEntry, type StudentMark } from '@/lib/gradebook-helpers';

/** One learner's marks across assessments, for the gradebook's history dialog. */
export function useStudentMarkHistory() {
  const [studentHistory, setStudentHistory] = useState<StudentMark[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<MarkEntry | null>(null);

  const fetchStudentHistory = useCallback(async (studentId: string) => {
    try {
      const res = await apiClient.get(`/academic/marks/student/${studentId}`);
      setStudentHistory(mapStudentHistory(unwrapList<Record<string, unknown>>(res)));
    } catch (err: unknown) {
      console.error('Failed to load student history', err);
      toast.error('Could not load student history.');
      setStudentHistory([]);
    }
  }, []);

  return { studentHistory, selectedStudent, setSelectedStudent, fetchStudentHistory };
}
