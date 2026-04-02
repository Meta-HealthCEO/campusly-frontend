'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SuspendTenantDialog } from '@/components/superadmin/SuspendTenantDialog';
import { MODULES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import type { Tenant, TenantStatus, PlatformInvoice } from '@/types';

const STATUS_STYLES: Record<TenantStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-blue-100 text-blue-700',
  suspended: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-gray-100 text-gray-700',
};

const INV_STATUS_STYLES: Record<PlatformInvoice['status'], string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-destructive/10 text-destructive',
  draft: 'bg-gray-100 text-gray-700',
};

export default function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { invoices, invoicesLoading } = useSuperAdminStore();
  const {
    fetchTenantDetail, suspendTenant, updateTenantStatus,
    updateTenantModules, fetchInvoicesByTenant,
  } = useSuperAdmin();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [statusPending, setStatusPending] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const t = await fetchTenantDetail(id);
        setTenant(t);
        fetchInvoicesByTenant(id);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
          ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Tenant not found';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, fetchTenantDetail, fetchInvoicesByTenant]);

  const handleSuspend = async (reason: string) => {
    try {
      await suspendTenant(id, reason);
      toast.success(`${tenant?.name} has been suspended.`);
      const t = await fetchTenantDetail(id);
      setTenant(t);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to suspend tenant.';
      toast.error(msg);
    }
  };

  const handleActivate = async () => {
    setStatusPending(true);
    try {
      await updateTenantStatus(id, 'active');
      toast.success(`${tenant?.name} has been activated.`);
      const t = await fetchTenantDetail(id);
      setTenant(t);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to activate tenant.';
      toast.error(msg);
    } finally {
      setStatusPending(false);
    }
  };

  const handleToggleModule = async (moduleId: string) => {
    if (!tenant) return;
    const current = tenant.enabledModules;
    const updated = current.includes(moduleId)
      ? current.filter((m) => m !== moduleId)
      : [...current, moduleId];
    try {
      await updateTenantModules(id, updated);
      setTenant({ ...tenant, enabledModules: updated });
      toast.success(`Module ${moduleId} ${updated.includes(moduleId) ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to update modules.';
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading tenant...</p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground text-lg">{error ?? 'Tenant not found.'}</p>
        <Button variant="outline" onClick={() => router.push('/superadmin/schools')}>
          Back to Schools
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/superadmin/schools')} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={tenant.name || 'Unnamed School'}
          description={`${tenant.city}${tenant.province ? ', ' + tenant.province : ''}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Tenant Information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoRow label="Status">
              <Badge className={STATUS_STYLES[tenant.status]}>{tenant.status}</Badge>
            </InfoRow>
            <InfoRow label="Tier">
              <span className="capitalize font-medium">{tenant.tier}</span>
            </InfoRow>
            <InfoRow label="Admin Email">{tenant.adminEmail || '—'}</InfoRow>
            <InfoRow label="Admin Name">{tenant.adminName || '—'}</InfoRow>
            <InfoRow label="Students">{tenant.studentCount}</InfoRow>
            <InfoRow label="Joined">{tenant.createdAt ? formatDate(tenant.createdAt) : '—'}</InfoRow>
            {tenant.trialEndsAt && (
              <InfoRow label="Trial Ends">{formatDate(tenant.trialEndsAt)}</InfoRow>
            )}
            <InfoRow label="MRR">
              {tenant.status === 'trial' || tenant.status === 'suspended'
                ? '—'
                : formatCurrency(tenant.mrr)}
            </InfoRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tenant.status !== 'suspended' ? (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setSuspendOpen(true)}
              >
                Suspend School
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full"
                onClick={handleActivate}
                disabled={statusPending}
              >
                {statusPending ? 'Activating...' : 'Activate School'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Enabled Modules</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((mod) => {
              const enabled = tenant.enabledModules.includes(mod.id);
              return (
                <button
                  key={mod.id}
                  onClick={() => handleToggleModule(mod.id)}
                  className="flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  {enabled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{mod.name}</p>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {invoices.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Billing History</CardTitle></CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <p className="text-muted-foreground text-sm">Loading invoices...</p>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.issuedDate ? formatDate(inv.issuedDate) : '—'}</TableCell>
                        <TableCell>{inv.dueDate ? formatDate(inv.dueDate) : '—'}</TableCell>
                        <TableCell>{formatCurrency(inv.amount)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${INV_STATUS_STYLES[inv.status]}`}>
                            {inv.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <SuspendTenantDialog
        tenantName={tenant.name}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onConfirm={handleSuspend}
      />
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{children}</div>
    </div>
  );
}
