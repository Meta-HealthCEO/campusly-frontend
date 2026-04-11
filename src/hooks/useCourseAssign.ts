import { useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';

export interface AssignResult {
  attempted: number;
  newEnrolments: number;
  alreadyEnroled: number;
}

/**
 * Hook for the assign-to-class dialog. Just exposes a single
 * assignToClass mutation — the dialog UI composes this with the
 * existing useTeacherClasses hook for the class picker.
 */
export function useCourseAssign() {
  const assignToClass = useCallback(async (
    courseId: string,
    classId: string,
  ): Promise<AssignResult | null> => {
    try {
      const res = await apiClient.post(`/courses/${courseId}/assign`, { classId });
      const result = unwrapResponse<AssignResult>(res);
      toast.success(
        `Assigned to ${result.newEnrolments} new students (${result.alreadyEnroled} already enroled)`,
      );
      return result;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to assign course'));
      return null;
    }
  }, []);

  return { assignToClass };
}
