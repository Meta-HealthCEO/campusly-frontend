// Lookup hooks for the communication module: templates CRUD plus the
// grade/class/parent option lists used by the compose flows. Split from
// useCommunication.ts (which re-exports these) for file-size budget.

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { mapTemplate, mapId, extractArray } from '@/components/communication/mappers';
import type {
  MessageTemplate,
  CreateTemplateInput,
  GradeOption,
  ClassOption,
  ParentOption,
} from '@/components/communication/types';

// ============== useTemplates ==============
export function useTemplates() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/communication/templates', {
        params: { schoolId },
      });
      const raw = unwrapResponse(res);
      setTemplates(extractArray(raw).map(mapTemplate));
    } catch {
      console.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const createTemplate = async (data: Omit<CreateTemplateInput, 'schoolId'>) => {
    const res = await apiClient.post('/communication/templates', { ...data, schoolId });
    const mapped = mapTemplate(unwrapResponse(res));
    setTemplates((prev) => [mapped, ...prev]);
    return mapped;
  };

  const updateTemplate = async (
    id: string,
    data: Partial<Omit<CreateTemplateInput, 'schoolId'>>
  ) => {
    const res = await apiClient.put(`/communication/templates/${id}`, data);
    const mapped = mapTemplate(unwrapResponse(res));
    setTemplates((prev) => prev.map((t) => (t.id === id ? mapped : t)));
    return mapped;
  };

  const deleteTemplate = async (id: string) => {
    await apiClient.delete(`/communication/templates/${id}`);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return { templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate };
}

// ============== useBulkMessages ==============

// ============== useGradesAndClasses ==============
export function useGradesAndClasses() {
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [gradesRes, classesRes] = await Promise.all([
          apiClient.get('/academic/grades'),
          apiClient.get('/academic/classes'),
        ]);
        const gradesArr = extractArray(unwrapResponse(gradesRes));
        setGrades(gradesArr.map((g) => ({ id: mapId(g), name: (g.name as string) ?? '' })));

        const classesArr = extractArray(unwrapResponse(classesRes));
        setClasses(classesArr.map((c) => ({
          id: mapId(c),
          name: (c.name as string) ?? '',
          gradeId: (c.gradeId as string) ?? (c.grade as string) ?? undefined,
        })));
      } catch {
        console.error('Failed to load grades/classes');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { grades, classes, loading };
}

// ============== useParentsList ==============
export function useParentsList() {
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all: Record<string, unknown>[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await apiClient.get('/parents', { params: { page, limit: 100 } });
          const raw = unwrapResponse(res);
          all.push(...extractArray(raw));
          const rawTotalPages = raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>).totalPages
            : undefined;
          totalPages = typeof rawTotalPages === 'number' ? rawTotalPages : 1;
          page += 1;
        } while (page <= totalPages);

        const mapped = all.map((p) => {
          const populatedUser = typeof p.userId === 'object' && p.userId !== null
            ? p.userId as Record<string, unknown>
            : undefined;
          const userRaw = populatedUser ?? (p.user as Record<string, unknown> | undefined);
          const userId = typeof p.userId === 'string' ? p.userId : userRaw ? mapId(userRaw) : '';
          return {
            id: mapId(p),
            userId,
            firstName: (userRaw?.firstName as string) ?? (p.firstName as string) ?? '',
            lastName: (userRaw?.lastName as string) ?? (p.lastName as string) ?? '',
            email: (userRaw?.email as string) ?? (p.email as string) ?? '',
            relationship: (p.relationship as string) ?? undefined,
          };
        }).filter((parent) => parent.userId);

        const unique = new Map<string, ParentOption>();
        mapped.forEach((parent) => unique.set(parent.userId, parent));
        setParents(Array.from(unique.values()));
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 403) console.error('Failed to load parents');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { parents, loading };
}
