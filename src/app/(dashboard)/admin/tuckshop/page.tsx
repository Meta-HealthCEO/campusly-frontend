'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChartComponent } from '@/components/charts';
import { formatCurrency, formatDate } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import type { TuckshopItem } from '@/types';

const columns: ColumnDef<TuckshopItem>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'category',
    header: 'Category',
  },
  {
    id: 'price',
    header: 'Price',
    cell: ({ row }) => formatCurrency(row.original.price),
  },
  {
    id: 'allergens',
    header: 'Allergens',
    cell: ({ row }) =>
      row.original.allergens.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.original.allergens.map((allergen) => (
            <Badge key={allergen} variant="outline" className="text-xs">
              {allergen}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">None</span>
      ),
  },
  {
    id: 'available',
    header: 'Available',
    cell: ({ row }) => (
      <Badge
        className={
          row.original.isAvailable
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
      >
        {row.original.isAvailable ? 'Yes' : 'No'}
      </Badge>
    ),
  },
];

export default function TuckshopPage() {
  const [menuItems, setMenuItems] = useState<TuckshopItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [menuRes, salesRes] = await Promise.all([
          apiClient.get('/tuck-shop/menu'),
          apiClient.get('/tuck-shop/sales/daily'),
        ]);
        if (menuRes.data) {
          const d = menuRes.data.data ?? menuRes.data;
          setMenuItems(Array.isArray(d) ? d : d.data ?? []);
        }
        if (salesRes.data) {
          const d = salesRes.data.data ?? salesRes.data;
          setDailySales(Array.isArray(d) ? d : d.data ?? []);
        }
      } catch {
        console.error('Failed to load tuckshop data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalRevenue = dailySales.reduce((sum, day) => sum + day.totalRevenue, 0);
  const totalTransactions = dailySales.reduce((sum, day) => sum + day.totalTransactions, 0);
  const avgTransaction = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  const salesChartData = [...dailySales]
    .reverse()
    .map((day) => ({
      date: formatDate(day.date, 'dd MMM'),
      revenue: day.totalRevenue / 100,
      transactions: day.totalTransactions,
    }));

  return (
    <div className="space-y-6">
      <PageHeader title="Tuckshop Management" description="Manage menu items and track daily sales" />

      <Tabs defaultValue="menu">
        <TabsList>
          <TabsTrigger value="menu">Menu Items</TabsTrigger>
          <TabsTrigger value="sales">Daily Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="mt-4">
          <DataTable columns={columns} data={menuItems} searchKey="name" searchPlaceholder="Search items..." />
        </TabsContent>

        <TabsContent value="sales" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Total Revenue (7 days)" value={formatCurrency(totalRevenue)} icon={DollarSign} />
            <StatCard title="Total Transactions" value={totalTransactions.toString()} icon={ShoppingBag} />
            <StatCard title="Avg. Transaction" value={formatCurrency(avgTransaction)} icon={TrendingUp} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartComponent
                data={salesChartData as Record<string, unknown>[]}
                xKey="date"
                bars={[{ key: 'revenue', color: '#2563EB', name: 'Revenue (R)' }]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailySales.map((day) => (
                  <div key={day.date} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{formatDate(day.date)}</p>
                      <p className="text-sm text-muted-foreground">{day.totalTransactions} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(day.totalRevenue)}</p>
                      <p className="text-sm text-muted-foreground">Avg: {formatCurrency(day.averageTransaction)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
