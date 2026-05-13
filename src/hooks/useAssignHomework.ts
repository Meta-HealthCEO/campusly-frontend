import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import type { SchoolClass } from '@/types';
import type { AssignHomeworkFormValues } from '@/components/homework/AssignHomeworkDialog';

interface AssignPayload {
  resourceId: string;
  resourceTitle: string;
  subjectId: string;
  formData: AssignHomeworkFormValues;
}

export function useAssignHomework() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const res = await apiClient.get('/academic/classes');
      setClasses(unwrapList<SchoolClass>(res));
    } catch {
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClasses();
  }, [fetchClasses]);

  const assignHomework = useCallback(
    async ({ resourceId, resourceTitle, subjectId, formData }: AssignPayload) => {
      try {
        const payload = {
          type: 'reading' as const,
          title: resourceTitle,
          subjectId,
          classId: formData.classId,
          schoolId: user?.schoolId,
          dueDate: new Date(formData.dueDate).toISOString(),
          totalMarks: Number(formData.totalMarks),
          contentResourceId: resourceId,
        };
        await apiClient.post('/homework', payload);
        toast.success('Homework assigned successfully');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to assign homework'));
        return false;
      }
    },
    [user?.schoolId],
  );

  return { classes, classesLoading, refetchClasses: fetchClasses, assignHomework };
}
