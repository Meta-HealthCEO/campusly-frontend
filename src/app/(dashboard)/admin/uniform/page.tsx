'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '@/lib/api-client';
import { UniformStatCards } from '@/components/uniform/UniformStatCards';
import { CatalogTab } from '@/components/uniform/CatalogTab';
import { OrdersTab } from '@/components/uniform/OrdersTab';
import { PreOrdersTab } from '@/components/uniform/PreOrdersTab';
import { SecondHandTab } from '@/components/uniform/SecondHandTab';
import { LowStockTab } from '@/components/uniform/LowStockTab';

interface Stats {
  totalItems: number;
  activeOrders: number;
  secondHandListings: number;
  lowStockCount: number;
}

export default function AdminUniformPage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [stats, setStats] = useState<Stats>({
    totalItems: 0, activeOrders: 0, secondHandListings: 0, lowStockCount: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!schoolId) return;
    try {
      const [itemsRes, ordersRes, listingsRes, lowStockRes] = await Promise.allSettled([
        apiClient.get('/uniform/items', { params: { schoolId } }),
        apiClient.get('/uniform/orders', { params: { schoolId, status: 'pending' } }),
        apiClient.get('/uniform/second-hand', { params: { schoolId, status: 'available' } }),
        apiClient.get('/uniform/low-stock', { params: { schoolId } }),
      ]);

      const extractTotal = (res: PromiseSettledResult<{ data: { data?: { total?: number } } }>) => {
        if (res.status === 'fulfilled') {
          const raw = res.value.data.data ?? res.value.data;
          return (raw as Record<string, unknown>).total as number ?? 0;
        }
        return 0;
      };

      setStats({
        totalItems: extractTotal(itemsRes as PromiseSettledResult<{ data: { data?: { total?: number } } }>),
        activeOrders: extractTotal(ordersRes as PromiseSettledResult<{ data: { data?: { total?: number } } }>),
        secondHandListings: extractTotal(listingsRes as PromiseSettledResult<{ data: { data?: { total?: number } } }>),
        lowStockCount: extractTotal(lowStockRes as PromiseSettledResult<{ data: { data?: { total?: number } } }>),
      });
    } catch {
      console.error('Failed to load uniform stats');
    }
  }, [schoolId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uniform Management"
        description="Manage catalog, orders, pre-orders, second-hand marketplace, and stock levels"
      />

      <UniformStatCards
        totalItems={stats.totalItems}
        activeOrders={stats.activeOrders}
        secondHandListings={stats.secondHandListings}
        lowStockCount={stats.lowStockCount}
      />

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="pre-orders">Pre-Orders</TabsTrigger>
          <TabsTrigger value="second-hand">Second-Hand</TabsTrigger>
          <TabsTrigger value="low-stock">
            Low Stock
            {stats.lowStockCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {stats.lowStockCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          <CatalogTab />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <OrdersTab />
        </TabsContent>

        <TabsContent value="pre-orders" className="mt-4">
          <PreOrdersTab />
        </TabsContent>

        <TabsContent value="second-hand" className="mt-4">
          <SecondHandTab />
        </TabsContent>

        <TabsContent value="low-stock" className="mt-4">
          <LowStockTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
