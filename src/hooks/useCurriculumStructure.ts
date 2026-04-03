'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  CurriculumFrameworkItem,
  CurriculumNodeItem,
  CurriculumNodeWithChildren,
  CurriculumSubtree,
  CreateNodePayload,
  UpdateNodePayload,
  BulkImportPayload,
  BulkImportResult,
  CreateFrameworkPayload,
  NodeFilters,
} from '@/types';

export function useCurriculumStructure() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [frameworks, setFrameworks] = useState<CurriculumFrameworkItem[]>([]);
  const [nodes, setNodes] = useState<CurriculumNodeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<string>('');

  // ─── Frameworks ──────────────────────────────────────────────────────────────

  const fetchFrameworks = useCallback(async () => {
    try {
      const response = await apiClient.get('/curriculum-structure/frameworks');
      const data = unwrapList<CurriculumFrameworkItem>(response);
      setFrameworks(data);
      if (data.length > 0 && !selectedFramework) {
        const defaultFw = data.find((f: CurriculumFrameworkItem) => f.isDefault) ?? data[0];
        setSelectedFramework(defaultFw.id);
      }
    } catch (err: unknown) {
      console.error('Failed to load frameworks', err);
    }
  }, [selectedFramework]);

  const createFramework = useCallback(async (data: CreateFrameworkPayload) => {
    const response = await apiClient.post('/curriculum-structure/frameworks', data);
    const created = unwrapResponse<CurriculumFrameworkItem>(response);
    setFrameworks((prev) => [...prev, created]);
    toast.success('Framework created');
    return created;
  }, []);

  // ─── Nodes ───────────────────────────────────────────────────────────────────

  const fetchNodes = useCallback(async (filters?: NodeFilters) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (filters?.frameworkId) params.frameworkId = filters.frameworkId;
      if (filters?.parentId !== undefined) {
        params.parentId = filters.parentId === null ? 'null' : filters.parentId;
      }
      if (filters?.type) params.type = filters.type;
      if (filters?.search) params.search = filters.search;
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;

      const response = await apiClient.get('/curriculum-structure/nodes', { params });
      const result = unwrapResponse<{ nodes: CurriculumNodeItem[]; total: number }>(response);
      setNodes(result.nodes);
      setTotal(result.total);
    } catch (err: unknown) {
      console.error('Failed to load nodes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getNode = useCallback(async (id: string) => {
    const response = await apiClient.get(`/curriculum-structure/nodes/${id}`);
    return unwrapResponse<CurriculumNodeWithChildren>(response);
  }, []);

  const getSubtree = useCallback(async (id: string) => {
    const response = await apiClient.get(`/curriculum-structure/nodes/${id}/tree`);
    return unwrapResponse<CurriculumSubtree>(response);
  }, []);

  const createNode = useCallback(async (data: CreateNodePayload) => {
    const response = await apiClient.post('/curriculum-structure/nodes', data);
    const created = unwrapResponse<CurriculumNodeItem>(response);
    toast.success('Node created');
    return created;
  }, []);

  const updateNode = useCallback(async (id: string, data: UpdateNodePayload) => {
    const response = await apiClient.put(`/curriculum-structure/nodes/${id}`, data);
    const updated = unwrapResponse<CurriculumNodeItem>(response);
    toast.success('Node updated');
    return updated;
  }, []);

  const deleteNode = useCallback(async (id: string) => {
    await apiClient.delete(`/curriculum-structure/nodes/${id}`);
    toast.success('Node deleted');
  }, []);

  const bulkImport = useCallback(async (data: BulkImportPayload) => {
    const response = await apiClient.post('/curriculum-structure/nodes/bulk', data);
    const result = unwrapResponse<BulkImportResult>(response);
    toast.success(
      `Imported ${result.imported} nodes${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`,
    );
    return result;
  }, []);

  // ─── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (schoolId) fetchFrameworks();
  }, [schoolId, fetchFrameworks]);

  return {
    frameworks,
    nodes,
    total,
    loading,
    selectedFramework,
    setSelectedFramework,
    fetchFrameworks,
    createFramework,
    fetchNodes,
    getNode,
    getSubtree,
    createNode,
    updateNode,
    deleteNode,
    bulkImport,
  };
}
