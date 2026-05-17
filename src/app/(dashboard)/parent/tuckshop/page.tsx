'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  ShoppingBag, UtensilsCrossed, Receipt,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useParentTuckshop } from '@/hooks/useParentTuckshop';
import type { TuckshopOrder } from '@/types';

const orderColumns: ColumnDef<TuckshopOrder, unknown>[] = [
  { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => formatDate(row.original.createdAt, 'dd MMM yyyy HH:mm') },
  {
    id: 'items', header: 'Items',
    cell: ({ row }) => row.original.items?.map((item) => `${item.item?.name ?? 'Item'} x${item.quantity}`).join(', ') ?? '-',
  },
  { accessorKey: 'totalAmount', header: 'Total', cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.totalAmount)}</span> },
  {
    id: 'itemCount', header: 'Items Count',
    cell: ({ row }) => {
      const count = row.original.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
      return <Badge variant="secondary">{count} item{count !== 1 ? 's' : ''}</Badge>;
    },
  },
];

export default function TuckshopPage() {
  const { children } = useCurrentParent();
  const { childOrders, loading } = useParentTuckshop();

  const overallSpent = childOrders.reduce((sum, co) => sum + co.totalSpent, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Tuckshop" description="View your children's tuckshop spending." />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Total Spent" value={formatCurrency(overallSpent)} icon={ShoppingBag} description="This month" />
        <StatCard title="Total Orders" value={String(childOrders.reduce((sum, co) => sum + co.orders.length, 0))} icon={Receipt} description="Across all children" />
      </div>

      <Tabs defaultValue={children[0]?.id ?? ''}>
        <TabsList>
          {childOrders.map((co) => (
            <TabsTrigger key={co.childId} value={co.childId}>{co.firstName} {co.lastName}</TabsTrigger>
          ))}
        </TabsList>

        {childOrders.map((co) => (
          <TabsContent key={co.childId} value={co.childId} className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-primary/10 p-3"><UtensilsCrossed className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent This Month</p>
                    <p className="text-3xl font-bold">{formatCurrency(co.totalSpent)}</p>
                    <p className="text-sm text-muted-foreground">{co.orders.length} order{co.orders.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <CardDescription>Tuckshop purchase history for {co.firstName}</CardDescription>
              </CardHeader>
              <CardContent>
                {co.orders.length > 0 ? (
                  <DataTable columns={orderColumns} data={co.orders} searchKey="createdAt" searchPlaceholder="Search orders..." />
                ) : (
                  <EmptyState icon={ShoppingBag} title="No orders yet" description={`${co.firstName} has not made any tuckshop purchases yet.`} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
