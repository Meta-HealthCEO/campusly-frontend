import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useCurrentParent } from './useCurrentParent';
import type { TuckshopOrder } from '@/types';

export interface ChildOrderData {
  childId: string;
  firstName: string;
  lastName: string;
  orders: TuckshopOrder[];
  totalSpent: number;
  allergens: string[];
}

interface ParentTuckshopResult {
  childOrders: ChildOrderData[];
  loading: boolean;
}

function resolveChildName(child: Record<string, unknown>): { firstName: string; lastName: string } {
  const user = child.user as { firstName?: string; lastName?: string } | undefined;
  const userId = child.userId as { firstName?: string; lastName?: string } | string | undefined;
  const populatedUser = typeof userId === 'object' && userId !== null ? userId : undefined;
  return {
    firstName: user?.firstName ?? populatedUser?.firstName ?? (child.firstName as string) ?? '',
    lastName: user?.lastName ?? populatedUser?.lastName ?? (child.lastName as string) ?? '',
  };
}

export function useParentTuckshop(): ParentTuckshopResult {
  const { children, loading: parentLoading } = useCurrentParent();
  const [childOrders, setChildOrders] = useState<ChildOrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parentLoading) return;
    if (children.length === 0) { setLoading(false); return; }

    async function fetchData() {
      try {
        const results: ChildOrderData[] = [];
        for (const child of children) {
          let orders: TuckshopOrder[] = [];
          try {
            const res = await apiClient.get(`/tuck-shop/orders/student/${child.id}`);
            orders = unwrapList<TuckshopOrder>(res);
          } catch { /* no orders */ }

          const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);
          const allergens: string[] = child.medicalProfile?.allergies ?? [];
          const { firstName, lastName } = resolveChildName(child as unknown as Record<string, unknown>);

          results.push({ childId: child.id, firstName, lastName, orders, totalSpent, allergens });
        }
        setChildOrders(results);
      } catch {
        console.error('Failed to load tuckshop data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [parentLoading, children]);

  return { childOrders, loading: loading || parentLoading };
}
