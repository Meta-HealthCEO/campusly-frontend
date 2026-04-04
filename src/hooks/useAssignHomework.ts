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

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await apiClient.get('/academic/classes');
        setClasses(unwrapList<SchoolClass>(res));
      } catch {
        console.error('Failed to load classes');
      } finally {
        setClassesLoading(false);
      }
    }
    fetchClasses();
  }, []);

  const assignHomework = useCallback(
    async ({ resourceId, resourceTitle, subjectId, formData }: AssignPayload) => {
      try {
        const payload = {
          title: resourceTitle,
          description: formData.instructions || `Complete the resource: ${resourceTitle}`,
          subjectId,
          classId: formData.classId,
          schoolId: user?.schoolId,
          dueDate: new Date(formData.dueDate).toISOString(),
          totalMarks: Number(formData.totalMarks),
          resourceId,
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

  return { classes, classesLoading, assignHomework };
}
