'use client';

import { StatCard } from '@/components/shared/StatCard';
import { Shirt, ShoppingCart, Store, AlertTriangle } from 'lucide-react';

interface UniformStatCardsProps {
  totalItems: number;
  activeOrders: number;
  secondHandListings: number;
  lowStockCount: number;
}

export function UniformStatCards({
  totalItems,
  activeOrders,
  secondHandListings,
  lowStockCount,
}: UniformStatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Catalog Items"
        value={String(totalItems)}
        icon={Shirt}
        description="Total uniform items"
      />
      <StatCard
        title="Active Orders"
        value={String(activeOrders)}
        icon={ShoppingCart}
        description="Pending & processing"
      />
      <StatCard
        title="Second-Hand"
        value={String(secondHandListings)}
        icon={Store}
        description="Available listings"
      />
      <StatCard
        title="Low Stock"
        value={String(lowStockCount)}
        icon={AlertTriangle}
        description="Items need restocking"
        className={lowStockCount > 0 ? 'border-amber-300 dark:border-amber-700' : ''}
      />
    </div>
  );
}
