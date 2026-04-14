import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  AssessmentStructure,
  CreateStructurePayload,
  FromTemplatePayload,
} from '@/types';

interface Filters {
  term?: number;
  academicYear?: number;
  classId?: string;
  subjectId?: string;
}

export function useAssessmentStructures(filters?: Filters) {
  const [structures, setStructures] = useState<AssessmentStructure[]>([]);
  const [templates, setTemplates] = useState<AssessmentStructure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStructures = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (filters?.term !== undefined) params.term = filters.term;
      if (filters?.academicYear !== undefined) params.academicYear = filters.academicYear;
      if (filters?.classId) params.classId = filters.classId;
      if (filters?.subjectId) params.subjectId = filters.subjectId;

      const res = await apiClient.get('/assessment-structures', { params });
      setStructures(unwrapList<AssessmentStructure>(res));
    } catch (err: unknown) {
      console.error('Failed to load assessment structures', err);
      toast.error(extractErrorMessage(err, 'Could not load assessment structures'));
    } finally {
      setLoading(false);
    }
  }, [filters?.term, filters?.academicYear, filters?.classId, filters?.subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchStructures();
  }, [fetchStructures]);

  const createStructure = useCallback(async (payload: CreateStructurePayload) => {
    try {
      const res = await apiClient.post('/assessment-structures', payload);
      const created = unwrapResponse<AssessmentStructure>(res);
      setStructures((prev) => [created, ...prev]);
      toast.success('Assessment structure created');
      return created;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create structure'));
      throw err;
    }
  }, []);

  const deleteStructure = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/assessment-structures/${id}`);
      setStructures((prev) => prev.filter((s) => s.id !== id));
      toast.success('Structure deleted');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete structure'));
      throw err;
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiClient.get('/assessment-structures/templates');
      setTemplates(unwrapList<AssessmentStructure>(res));
    } catch (err: unknown) {
      console.error('Failed to load templates', err);
      toast.error(extractErrorMessage(err, 'Could not load templates'));
    }
  }, []);

  const createFromTemplate = useCallback(async (
    templateId: string,
    payload: FromTemplatePayload,
  ) => {
    try {
      const res = await apiClient.post(
        `/assessment-structures/from-template/${templateId}`,
        payload,
      );
      const created = unwrapResponse<AssessmentStructure>(res);
      setStructures((prev) => [created, ...prev]);
      toast.success('Structure created from template');
      return created;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create from template'));
      throw err;
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/assessment-structures/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Template deleted');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete template'));
      throw err;
    }
  }, []);

  return {
    structures,
    templates,
    loading,
    fetchStructures,
    createStructure,
    deleteStructure,
    fetchTemplates,
    createFromTemplate,
    deleteTemplate,
  };
}
