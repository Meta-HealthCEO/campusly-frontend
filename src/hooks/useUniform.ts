'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  UniformItem,
  UniformOrder,
  SecondHandListing,
  PreOrder,
  SizeGuide,
} from '@/components/uniform/types';

function mapId(obj: Record<string, unknown>): Record<string, unknown> {
  return { ...obj, id: (obj._id as string) ?? (obj.id as string) };
}

function unwrapList<T>(raw: unknown, key: string): T[] {
  const data = raw as Record<string, unknown>;
  const arr = data[key] ?? data.data ?? raw;
  const list = Array.isArray(arr) ? arr : [];
  return list.map((item) => mapId(item as Record<string, unknown>) as unknown as T);
}

export interface UniformStats {
  totalItems: number;
  activeOrders: number;
  secondHandListings: number;
  lowStockCount: number;
}

export function useUniformStats() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [stats, setStats] = useState<UniformStats>({
    totalItems: 0, activeOrders: 0, secondHandListings: 0, lowStockCount: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!schoolId) return;
    try {
      const [itemsRes, ordersRes, listingsRes, lowStockRes] = await Promise.allSettled([
        apiClient.get('/uniforms/items', { params: { schoolId } }),
        apiClient.get('/uniforms/orders', { params: { schoolId, status: 'pending' } }),
        apiClient.get('/uniforms/second-hand', { params: { schoolId, status: 'available' } }),
        apiClient.get('/uniforms/low-stock', { params: { schoolId } }),
      ]);

      const extractTotal = (res: PromiseSettledResult<{ data: { data?: unknown } }>) => {
        if (res.status === 'fulfilled') {
          const raw = unwrapResponse(res.value);
          return (raw as Record<string, unknown>).total as number ?? 0;
        }
        return 0;
      };

      setStats({
        totalItems: extractTotal(itemsRes as PromiseSettledResult<{ data: { data?: unknown } }>),
        activeOrders: extractTotal(ordersRes as PromiseSettledResult<{ data: { data?: unknown } }>),
        secondHandListings: extractTotal(listingsRes as PromiseSettledResult<{ data: { data?: unknown } }>),
        lowStockCount: extractTotal(lowStockRes as PromiseSettledResult<{ data: { data?: unknown } }>),
      });
    } catch {
      console.error('Failed to load uniform stats');
    }
  }, [schoolId]);

  return { stats, fetchStats };
}

export function useUniformItems() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [items, setItems] = useState<UniformItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async (category?: string) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (category && category !== 'all') params.category = category;
      const response = await apiClient.get('/uniforms/items', { params });
      const raw = unwrapResponse(response);
      setItems(unwrapList<UniformItem>(raw, 'items'));
    } catch {
      console.error('Failed to load uniform items');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  return { items, loading, fetchItems, schoolId };
}

export function useUniformOrders() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [orders, setOrders] = useState<UniformOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async (status?: string) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (status && status !== 'all') params.status = status;
      const response = await apiClient.get('/uniforms/orders', { params });
      const raw = unwrapResponse(response);
      setOrders(unwrapList<UniformOrder>(raw, 'orders'));
    } catch {
      console.error('Failed to load uniform orders');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  return { orders, loading, fetchOrders, schoolId };
}

export function useSecondHand() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [listings, setListings] = useState<SecondHandListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async (status?: string) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (status && status !== 'all') params.status = status;
      const response = await apiClient.get('/uniforms/second-hand', { params });
      const raw = unwrapResponse(response);
      setListings(unwrapList<SecondHandListing>(raw, 'listings'));
    } catch {
      console.error('Failed to load second-hand listings');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  return { listings, loading, fetchListings, schoolId };
}

export function usePreOrders() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPreOrders = useCallback(async (status?: string) => {
    try {
      const params: Record<string, string> = { schoolId };
      if (status && status !== 'all') params.status = status;
      const response = await apiClient.get('/uniforms/pre-orders', { params });
      const raw = unwrapResponse(response);
      setPreOrders(unwrapList<PreOrder>(raw, 'preOrders'));
    } catch {
      console.error('Failed to load pre-orders');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  return { preOrders, loading, fetchPreOrders, schoolId };
}

export function useLowStock() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [lowStockItems, setLowStockItems] = useState<UniformItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLowStock = useCallback(async () => {
    try {
      const response = await apiClient.get('/uniforms/low-stock', {
        params: { schoolId },
      });
      const raw = unwrapResponse(response);
      setLowStockItems(unwrapList<UniformItem>(raw, 'items'));
    } catch {
      console.error('Failed to load low stock items');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  return { lowStockItems, loading, fetchLowStock, schoolId };
}

export function useSizeGuide(itemId: string) {
  const [sizeGuide, setSizeGuide] = useState<SizeGuide | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSizeGuide = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/uniforms/items/${itemId}/size-guide`);
      const raw = unwrapResponse(response);
      const mapped = mapId(raw as Record<string, unknown>);
      setSizeGuide(mapped as unknown as SizeGuide);
    } catch {
      setSizeGuide(null);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  return { sizeGuide, loading, fetchSizeGuide };
}
