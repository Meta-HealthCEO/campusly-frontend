import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { TbSubjectRequirement, SubjectLine } from '@/types';

export function useTimetableRequirements() {
  const [requirements, setRequirements] = useState<TbSubjectRequirement[]>([]);
  const [lines, setLines] = useState<SubjectLine[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRequirements = useCallback(async (gradeId?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (gradeId) params.gradeId = gradeId;
      const res = await apiClient.get('/timetable-builder/requirements', { params });
      setRequirements(unwrapList<TbSubjectRequirement>(res));
    } catch {
      console.error('Failed to load subject requirements');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRequirement = useCallback(
    async (data: Partial<TbSubjectRequirement> & { id?: string }) => {
      try {
        if (data.id) {
          const res = await apiClient.put(
            `/timetable-builder/requirements/${data.id}`,
            data,
          );
          const saved = unwrapResponse<TbSubjectRequirement>(res);
          setRequirements((prev) =>
            prev.map((r) => (r.id === saved.id ? saved : r)),
          );
          toast.success('Requirement updated');
          return saved;
        }
        const res = await apiClient.post('/timetable-builder/requirements', data);
        const saved = unwrapResponse<TbSubjectRequirement>(res);
        setRequirements((prev) => [...prev, saved]);
        toast.success('Requirement added');
        return saved;
      } catch (err: unknown) {
        toast.error('Failed to save requirement');
        throw err;
      }
    },
    [],
  );

  const deleteRequirement = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/timetable-builder/requirements/${id}`);
      setRequirements((prev) => prev.filter((r) => r.id !== id));
      toast.success('Requirement removed');
    } catch (err: unknown) {
      toast.error('Failed to delete requirement');
      throw err;
    }
  }, []);

  const loadLines = useCallback(async (gradeId?: string) => {
    try {
      const params: Record<string, string> = {};
      if (gradeId) params.gradeId = gradeId;
      const res = await apiClient.get('/timetable-builder/lines', { params });
      setLines(unwrapList<SubjectLine>(res));
    } catch {
      console.error('Failed to load subject lines');
    }
  }, []);

  const saveLine = useCallback(async (data: Partial<SubjectLine> & { id?: string }) => {
    try {
      if (data.id) {
        const res = await apiClient.put(`/timetable-builder/lines/${data.id}`, data);
        const saved = unwrapResponse<SubjectLine>(res);
        setLines((prev) => prev.map((l) => (l.id === saved.id ? saved : l)));
        toast.success('Line updated');
        return saved;
      }
      const res = await apiClient.post('/timetable-builder/lines', data);
      const saved = unwrapResponse<SubjectLine>(res);
      setLines((prev) => [...prev, saved]);
      toast.success('Line added');
      return saved;
    } catch (err: unknown) {
      toast.error('Failed to save subject line');
      throw err;
    }
  }, []);

  const deleteLine = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/timetable-builder/lines/${id}`);
      setLines((prev) => prev.filter((l) => l.id !== id));
      toast.success('Line removed');
    } catch (err: unknown) {
      toast.error('Failed to delete line');
      throw err;
    }
  }, []);

  const suggestLines = useCallback(async (gradeId: string) => {
    try {
      const res = await apiClient.post('/timetable-builder/lines/suggest', { gradeId });
      const suggested = unwrapList<SubjectLine>(res);
      setLines(suggested);
      toast.success('AI suggested lines loaded');
      return suggested;
    } catch (err: unknown) {
      toast.error('Failed to get line suggestions');
      throw err;
    }
  }, []);

  return {
    requirements,
    lines,
    loading,
    loadRequirements,
    saveRequirement,
    deleteRequirement,
    loadLines,
    saveLine,
    deleteLine,
    suggestLines,
  };
}
