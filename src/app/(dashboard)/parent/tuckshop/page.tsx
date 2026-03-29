'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  ShoppingBag, AlertTriangle, UtensilsCrossed, Receipt,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mockStudents, mockTuckshopOrders } from '@/lib/mock-data';
import type { TuckshopOrder } from '@/types';

const parentChildren = mockStudents.slice(0, 2);

const orderColumns: ColumnDef<TuckshopOrder, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.createdAt, 'dd MMM yyyy HH:mm'),
  },
  {
    id: 'items',
    header: 'Items',
    cell: ({ row }) =>
      row.original.items
        .map((item) => `${item.item.name} x${item.quantity}`)
        .join(', '),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.original.totalAmount)}</span>
    ),
  },
  {
    id: 'itemCount',
    header: 'Items Count',
    cell: ({ row }) => {
      const count = row.original.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      return (
        <Badge variant="secondary">
          {count} item{count !== 1 ? 's' : ''}
        </Badge>
      );
    },
  },
];

export default function TuckshopPage() {
  const childOrders = parentChildren.map((child) => {
    const orders = mockTuckshopOrders.filter(
      (o) => o.studentId === child.id
    );
    const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const allergens = child.medicalInfo.allergies;
    return { child, orders, totalSpent, allergens };
  });

  const overallSpent = childOrders.reduce(
    (sum, co) => sum + co.totalSpent,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tuckshop"
        description="View your children's tuckshop spending and manage allergen preferences."
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Spent"
          value={formatCurrency(overallSpent)}
          icon={ShoppingBag}
          description="This month"
        />
        <StatCard
          title="Total Orders"
          value={String(
            childOrders.reduce((sum, co) => sum + co.orders.length, 0)
          )}
          icon={Receipt}
          description="Across all children"
        />
        <StatCard
          title="Allergen Alerts"
          value={String(
            childOrders.filter((co) => co.allergens.length > 0).length
          )}
          icon={AlertTriangle}
          description="Children with allergies"
        />
      </div>

      {/* Per-child tabs */}
      <Tabs defaultValue={parentChildren[0]?.id ?? ''}>
        <TabsList>
          {parentChildren.map((child) => (
            <TabsTrigger key={child.id} value={child.id}>
              {child.user.firstName} {child.user.lastName}
            </TabsTrigger>
          ))}
        </TabsList>

        {childOrders.map(({ child, orders, totalSpent, allergens }) => (
          <TabsContent key={child.id} value={child.id} className="space-y-6">
            {/* Allergen Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Allergen Information
                </CardTitle>
                <CardDescription>
                  Dietary restrictions and allergies for {child.user.firstName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allergens.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allergens.map((allergen) => (
                      <Badge
                        key={allergen}
                        variant="secondary"
                        className="bg-red-100 text-red-800 px-3 py-1"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No known allergies recorded for {child.user.firstName}.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Spending Summary */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <UtensilsCrossed className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Spent This Month
                    </p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(totalSpent)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {orders.length} order{orders.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <CardDescription>
                  Tuckshop purchase history for {child.user.firstName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length > 0 ? (
                  <>
                    {/* Detailed order cards */}
                    <div className="space-y-3 mb-6">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="rounded-lg border p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {formatDate(
                                order.createdAt,
                                'EEEE, dd MMM yyyy'
                              )}
                            </p>
                            <span className="font-semibold">
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-sm text-muted-foreground"
                              >
                                <span>
                                  {item.item.name} x{item.quantity}
                                </span>
                                <span>{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <DataTable
                      columns={orderColumns}
                      data={orders}
                      searchKey="createdAt"
                      searchPlaceholder="Search orders..."
                    />
                  </>
                ) : (
                  <EmptyState
                    icon={ShoppingBag}
                    title="No orders yet"
                    description={`${child.user.firstName} has not made any tuckshop purchases yet.`}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
