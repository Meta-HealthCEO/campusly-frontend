'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { TuckshopItem, Student } from '@/types';

/** Error message extractor for API errors */
function extractErrorMessage(err: unknown, fallback: string): string {
  const resp = (err as { response?: { data?: { error?: string; message?: string }; status?: number } })?.response;
  return resp?.data?.error ?? resp?.data?.message ?? fallback;
}

/** Extract allergen-related status from error */
function extractAllergenInfo(err: unknown): { isAllergen: boolean; message: string } {
  const resp = (err as { response?: { data?: { message?: string }; status?: number } })?.response;
  const msg = resp?.data?.message ?? 'Failed to place order';
  const isAllergen = resp?.status === 400 && msg.toLowerCase().includes('allerg');
  return { isAllergen, message: msg };
}

// ── Shared data fetchers ──────────────────────────────────────

function mapId(item: Record<string, unknown>): Record<string, unknown> {
  return { ...item, id: (item._id as string) ?? (item.id as string) };
}

export function useTuckShopStudents() {
  const [students, setStudents] = useState<Student[]>([]);

  const fetchStudents = useCallback(async (): Promise<Student[]> => {
    try {
      const res = await apiClient.get('/students');
      const raw = unwrapResponse(res);
      const list: Student[] = Array.isArray(raw) ? raw : raw.students ?? raw.data ?? [];
      setStudents(list);
      return list;
    } catch {
      console.error('Failed to load students');
      return [];
    }
  }, []);

  return { students, fetchStudents };
}

export function useTuckShopMenu() {
  const [menuItems, setMenuItems] = useState<TuckshopItem[]>([]);

  const fetchMenu = useCallback(async (): Promise<TuckshopItem[]> => {
    try {
      const res = await apiClient.get('/tuck-shop/menu');
      const raw = unwrapResponse(res);
      const list = Array.isArray(raw) ? raw : raw.items ?? raw.data ?? [];
      const mapped = list.map((item: Record<string, unknown>) =>
        mapId(item) as unknown as TuckshopItem,
      );
      setMenuItems(mapped);
      return mapped;
    } catch {
      console.error('Failed to load menu');
      return [];
    }
  }, []);

  return { menuItems, fetchMenu };
}

// ── Order mutations ───────────────────────────────────────────

interface PlaceOrderPayload {
  schoolId: string;
  studentId: string;
  items: Array<{ menuItemId: string; quantity: number }>;
  paymentMethod: string;
  wristbandId?: string;
  allergenOverride?: boolean;
}

export function useTuckShopOrders() {
  const placeOrder = useCallback(async (body: PlaceOrderPayload): Promise<void> => {
    await apiClient.post('/tuck-shop/orders', body);
  }, []);

  return { placeOrder, extractErrorMessage, extractAllergenInfo };
}

// ── Order history ─────────────────────────────────────────────

interface OrderHistoryItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderHistoryEntry {
  id: string;
  studentId: string | { _id: string; firstName: string; lastName: string };
  items: OrderHistoryItem[];
  totalAmount: number;
  paymentMethod: string;
  processedBy: string | { firstName: string; lastName: string; email: string };
  createdAt: string;
}

interface OrderHistoryResult {
  orders: OrderHistoryEntry[];
  totalPages: number;
}

export function useTuckShopOrderHistory() {
  const fetchStudentOrders = useCallback(
    async (studentId: string, page: number, limit = 10): Promise<OrderHistoryResult> => {
      try {
        const res = await apiClient.get(`/tuck-shop/orders/student/${studentId}`, {
          params: { page, limit },
        });
        const raw = unwrapResponse(res);
        const orderList = Array.isArray(raw) ? raw : raw.orders ?? raw.data ?? [];
        const orders = orderList.map((o: Record<string, unknown>) =>
          mapId(o) as unknown as OrderHistoryEntry,
        );
        const totalPages = typeof raw.totalPages === 'number' ? raw.totalPages : 1;
        return { orders, totalPages };
      } catch {
        return { orders: [], totalPages: 1 };
      }
    },
    [],
  );

  return { fetchStudentOrders };
}

// ── Menu item mutations ───────────────────────────────────────

export function useTuckShopMenuMutations() {
  const createMenuItem = useCallback(async (body: Record<string, unknown>): Promise<void> => {
    await apiClient.post('/tuck-shop/menu', body);
  }, []);

  const updateMenuItem = useCallback(async (itemId: string, body: Record<string, unknown>): Promise<void> => {
    await apiClient.put(`/tuck-shop/menu/${itemId}`, body);
  }, []);

  const updateStock = useCallback(async (itemId: string, stock: number): Promise<void> => {
    await apiClient.patch(`/tuck-shop/menu/${itemId}/stock`, { stock });
  }, []);

  const deleteMenuItem = useCallback(async (itemId: string): Promise<void> => {
    await apiClient.delete(`/tuck-shop/menu/${itemId}`);
  }, []);

  return { createMenuItem, updateMenuItem, updateStock, deleteMenuItem, extractErrorMessage };
}

// ── Daily sales ───────────────────────────────────────────────

interface PaymentMethodBreakdown {
  paymentMethod: string;
  totalSales: number;
  orderCount: number;
}

interface DailySalesData {
  totalSales: number;
  orderCount: number;
  byPaymentMethod: PaymentMethodBreakdown[];
}

export function useTuckShopDailySales(schoolId: string) {
  const [salesData, setSalesData] = useState<DailySalesData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSales = useCallback(async (date: string) => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const response = await apiClient.get('/tuck-shop/sales/daily', {
        params: { schoolId, date },
      });
      const raw = unwrapResponse(response);
      setSalesData({
        totalSales: raw.totalSales ?? 0,
        orderCount: raw.orderCount ?? 0,
        byPaymentMethod: Array.isArray(raw.byPaymentMethod) ? raw.byPaymentMethod : [],
      });
    } catch {
      setSalesData({ totalSales: 0, orderCount: 0, byPaymentMethod: [] });
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  return { salesData, loading, fetchSales };
}
