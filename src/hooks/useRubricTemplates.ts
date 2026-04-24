import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { extractApiError } from './ai-tools-helpers';
import type { RubricTemplate } from './ai-tools-helpers';

export type { RubricTemplate } from './ai-tools-helpers';

export function useRubricTemplates() {
  const listRubricTemplates = useCallback(async (): Promise<RubricTemplate[]> => {
    try {
      const response = await apiClient.get('/ai-tools/grade/rubric-templates');
      const raw = unwrapList<Record<string, unknown>>(response);
      return raw.map((r) => ({
        ...r,
        id: ((r._id ?? r.id) as string),
      })) as RubricTemplate[];
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to load rubric templates'));
      return [];
    }
  }, []);

  const createRubricTemplate = useCallback(async (data: {
    name: string;
    description?: string;
    criteria: Array<{ criterion: string; maxScore: number; description: string }>;
    isShared?: boolean;
  }): Promise<RubricTemplate | null> => {
    try {
      const response = await apiClient.post('/ai-tools/grade/rubric-templates', data);
      const raw = unwrapResponse<Record<string, unknown>>(response);
      toast.success('Rubric template saved');
      return { ...raw, id: ((raw._id ?? raw.id) as string) } as RubricTemplate;
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to save rubric template'));
      return null;
    }
  }, []);

  const deleteRubricTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/ai-tools/grade/rubric-templates/${id}`);
      toast.success('Template deleted');
      return true;
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to delete template'));
      return false;
    }
  }, []);

  return { listRubricTemplates, createRubricTemplate, deleteRubricTemplate };
}
