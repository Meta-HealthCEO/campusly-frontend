'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUniformStats } from '@/hooks/useUniform';
import { UniformStatCards } from '@/components/uniform/UniformStatCards';
import { CatalogTab } from '@/components/uniform/CatalogTab';
import { OrdersTab } from '@/components/uniform/OrdersTab';
import { PreOrdersTab } from '@/components/uniform/PreOrdersTab';
import { SecondHandTab } from '@/components/uniform/SecondHandTab';
import { LowStockTab } from '@/components/uniform/LowStockTab';

export default function AdminUniformPage() {
  const { stats, fetchStats } = useUniformStats();

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
