import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { HomeworkTemplate } from '@/types';

interface CreateTemplatePayload {
  title: string;
  description?: string;
  subjectId: string;
  totalMarks: number;
  rubric?: string;
  attachments?: Array<{ url: string; name: string }>;
}

interface ClonePayload {
  classId: string;
  dueDate: string;
  title?: string;
}

export function useHomeworkTemplates() {
  const [templates, setTemplates] = useState<HomeworkTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async (subjectId?: string) => {
    try {
      const query = subjectId ? `?subjectId=${subjectId}` : '';
      const res = await apiClient.get(`/homework/templates${query}`);
      const data = unwrapList<Record<string, unknown>>(res);
      setTemplates(data.map((d) => ({
        ...d,
        id: (d._id as string) ?? (d.id as string) ?? '',
      })) as unknown as HomeworkTemplate[]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401 && status !== 403) {
        console.error('Failed to fetch templates', extractErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (data: CreateTemplatePayload): Promise<boolean> => {
    try {
      const res = await apiClient.post('/homework/templates', data);
      const created = unwrapResponse<Record<string, unknown>>(res);
      const newTemplate = {
        ...created,
        id: (created._id as string) ?? (created.id as string) ?? '',
      } as unknown as HomeworkTemplate;
      setTemplates((prev) => [newTemplate, ...prev]);
      toast.success('Template saved');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create template'));
      return false;
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/homework/templates/${templateId}`);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast.success('Template deleted');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete template'));
      return false;
    }
  }, []);

  const cloneTemplate = useCallback(async (
    templateId: string,
    overrides: ClonePayload,
  ): Promise<Record<string, unknown> | null> => {
    try {
      const res = await apiClient.post(
        `/homework/templates/${templateId}/clone`,
        { ...overrides, dueDate: new Date(overrides.dueDate).toISOString() },
      );
      const homework = unwrapResponse<Record<string, unknown>>(res);
      toast.success('Homework created from template');
      return homework;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to clone template'));
      return null;
    }
  }, []);

  const saveAsTemplate = useCallback(async (homeworkId: string): Promise<boolean> => {
    try {
      const res = await apiClient.post(`/homework/${homeworkId}/save-as-template`);
      const created = unwrapResponse<Record<string, unknown>>(res);
      const newTemplate = {
        ...created,
        id: (created._id as string) ?? (created.id as string) ?? '',
      } as unknown as HomeworkTemplate;
      setTemplates((prev) => [newTemplate, ...prev]);
      toast.success('Saved as template');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save as template'));
      return false;
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    cloneTemplate,
    saveAsTemplate,
  };
}

export type { CreateTemplatePayload, ClonePayload };
