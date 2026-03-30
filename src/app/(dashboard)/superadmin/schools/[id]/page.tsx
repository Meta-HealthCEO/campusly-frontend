'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { mockTenants, mockPlatformInvoices } from '@/lib/mock-data';
import { MODULES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { TenantStatus, SubscriptionTier } from '@/types';
import { toast } from 'sonner';

const STATUS_STYLES: Record<TenantStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const TIER_STYLES: Record<SubscriptionTier, string> = {
  enterprise: 'bg-purple-100 text-purple-700',
  growth: 'bg-indigo-100 text-indigo-700',
  starter: 'bg-amber-100 text-amber-700',
};

const TIER_PRICE: Record<SubscriptionTier, number> = {
  enterprise: 1499900,
  growth: 799900,
  starter: 299900,
};

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const tenant = mockTenants.find((t) => t.id === id);
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground text-lg">School not found.</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const tenantInvoices = mockPlatformInvoices.filter((inv) => inv.tenantId === id);

  const handleToggleStatus = () => {
    const action = tenant.status === 'suspended' ? 'activated' : 'suspended';
    toast.success(`${tenant.name} has been ${action}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-muted-foreground">{tenant.city}, {tenant.province}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* School Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>School Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Admin</p>
                <p className="font-medium">{tenant.adminName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{tenant.adminEmail}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Students</p>
                <p className="font-medium">{tenant.studentCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="font-medium">{formatDate(tenant.createdAt)}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[tenant.status]}`}>
                {tenant.status}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${TIER_STYLES[tenant.tier]}`}>
                {tenant.tier}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-semibold capitalize text-lg">{tenant.tier}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Rate</p>
              <p className="font-semibold text-lg">
                {tenant.status === 'trial' ? 'Free Trial' : formatCurrency(TIER_PRICE[tenant.tier])}
              </p>
            </div>
            {tenant.trialEndsAt && (
              <div>
                <p className="text-xs text-muted-foreground">Trial Ends</p>
                <p className="font-medium text-amber-600">{formatDate(tenant.trialEndsAt)}</p>
              </div>
            )}
            <Separator />
            <div className="flex flex-col gap-2">
              <Button
                variant={tenant.status === 'suspended' ? 'default' : 'destructive'}
                size="sm"
                onClick={handleToggleStatus}
              >
                {tenant.status === 'suspended' ? 'Activate School' : 'Suspend School'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Enabled Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((mod) => {
              const enabled = tenant.enabledModules.includes(mod.id);
              return (
                <div key={mod.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Checkbox
                    checked={enabled}
                    onCheckedChange={() => toast.info(`Module toggled: ${mod.name}`)}
                  />
                  <div>
                    <p className="text-sm font-medium">{mod.name}</p>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">{tenant.studentCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Students</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">{tenant.enabledModules.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Active Modules</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">{tenantInvoices.filter(i => i.status === 'paid').length}</p>
              <p className="text-xs text-muted-foreground mt-1">Paid Invoices</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">{tenantInvoices.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Invoices</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      {tenantInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenantInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inv.issuedDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatCurrency(inv.amount)}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${{
                      paid: 'bg-emerald-100 text-emerald-700',
                      sent: 'bg-blue-100 text-blue-700',
                      overdue: 'bg-red-100 text-red-700',
                      draft: 'bg-gray-100 text-gray-700',
                    }[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
