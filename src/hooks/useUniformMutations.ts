'use client';

import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type {
  UniformItem,
  SizeGuide,
  SizeGuideMeasurement,
  UniformOrderStatus,
  PreOrderStatus,
} from '@/components/uniform/types';

/** Error message extractor for API errors */
function extractErrorMessage(err: unknown, fallback: string): string {
  const resp = (err as { response?: { data?: { error?: string; message?: string }; status?: number } })?.response;
  return resp?.data?.error ?? resp?.data?.message ?? fallback;
}

// ── Catalog item mutations ────────────────────────────────────

interface SaveItemPayload {
  name: string;
  schoolId: string;
  description?: string;
  category: string;
  sizes: string[];
  price: number;
  stock: number;
  isAvailable: boolean;
  lowStockThreshold: number;
  image?: string;
  sizeGuideUrl?: string;
}

export function useUniformItemMutations() {
  const createItem = useCallback(async (body: SaveItemPayload): Promise<void> => {
    await apiClient.post('/uniforms/items', body);
  }, []);

  const updateItem = useCallback(async (itemId: string, body: SaveItemPayload): Promise<void> => {
    await apiClient.put(`/uniforms/items/${itemId}`, body);
  }, []);

  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    await apiClient.delete(`/uniforms/items/${itemId}`);
  }, []);

  const toggleAvailability = useCallback(async (item: UniformItem): Promise<void> => {
    await apiClient.put(`/uniforms/items/${item.id}`, {
      isAvailable: !item.isAvailable,
    });
  }, []);

  return { createItem, updateItem, deleteItem, toggleAvailability, extractErrorMessage };
}

// ── Order mutations ───────────────────────────────────────────

export function useUniformOrderMutations() {
  const updateOrderStatus = useCallback(async (orderId: string, status: UniformOrderStatus): Promise<void> => {
    await apiClient.patch(`/uniforms/orders/${orderId}/status`, { status });
  }, []);

  const deleteOrder = useCallback(async (orderId: string): Promise<void> => {
    await apiClient.delete(`/uniforms/orders/${orderId}`);
  }, []);

  return { updateOrderStatus, deleteOrder, extractErrorMessage };
}

// ── Pre-order mutations ───────────────────────────────────────

export function usePreOrderMutations() {
  const updatePreOrderStatus = useCallback(async (preOrderId: string, status: PreOrderStatus): Promise<void> => {
    await apiClient.patch(`/uniforms/pre-orders/${preOrderId}/status`, { status });
  }, []);

  const deletePreOrder = useCallback(async (preOrderId: string): Promise<void> => {
    await apiClient.delete(`/uniforms/pre-orders/${preOrderId}`);
  }, []);

  return { updatePreOrderStatus, deletePreOrder, extractErrorMessage };
}

// ── Second-hand mutations ─────────────────────────────────────

export function useSecondHandMutations() {
  const markSold = useCallback(async (listingId: string): Promise<void> => {
    await apiClient.patch(`/uniforms/second-hand/${listingId}/sold`);
  }, []);

  return { markSold, extractErrorMessage };
}

// ── Size guide mutations ──────────────────────────────────────

interface SizeGuidePayload {
  schoolId: string;
  sizeChartImageUrl: string;
  measurements: SizeGuideMeasurement[];
  notes?: string;
}

interface SizeGuideResult {
  sizeGuide: SizeGuide;
}

export function useSizeGuideMutations() {
  const fetchSizeGuide = useCallback(async (itemId: string): Promise<SizeGuideResult | null> => {
    try {
      const response = await apiClient.get(`/uniforms/items/${itemId}/size-guide`);
      const raw = unwrapResponse(response);
      const guide = { ...(raw as Record<string, unknown>), id: (raw._id as string) ?? (raw.id as string) } as unknown as SizeGuide;
      return { sizeGuide: guide };
    } catch {
      return null;
    }
  }, []);

  const createSizeGuide = useCallback(async (itemId: string, body: SizeGuidePayload): Promise<void> => {
    await apiClient.post(`/uniforms/items/${itemId}/size-guide`, body);
  }, []);

  const updateSizeGuide = useCallback(async (itemId: string, body: SizeGuidePayload): Promise<void> => {
    await apiClient.put(`/uniforms/items/${itemId}/size-guide`, body);
  }, []);

  const deleteSizeGuide = useCallback(async (itemId: string): Promise<void> => {
    await apiClient.delete(`/uniforms/items/${itemId}/size-guide`);
  }, []);

  return { fetchSizeGuide, createSizeGuide, updateSizeGuide, deleteSizeGuide, extractErrorMessage };
}
