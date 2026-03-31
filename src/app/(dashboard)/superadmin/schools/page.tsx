'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { SuspendTenantDialog } from '@/components/superadmin/SuspendTenantDialog';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';
import { formatCurrency } from '@/lib/utils';
import type { Tenant, TenantStatus } from '@/types';

const STATUS_STYLES: Record<TenantStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const TIER_STYLES: Record<string, string> = {
  enterprise: 'bg-purple-100 text-purple-700',
  growth: 'bg-indigo-100 text-indigo-700',
  starter: 'bg-amber-100 text-amber-700',
};

export default function SuperAdminSchoolsPage() {
  const router = useRouter();
  const { tenants, tenantsLoading, tenantsTotal, fetchTenants, suspendTenant, updateTenantStatus } =
    useSuperAdminStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [suspendTarget, setSuspendTarget] = useState<Tenant | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleSearchChange = (term: string) => {
    setSearch(term);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params: Record<string, string> = { search: term };
      if (statusFilter !== 'all') params.status = statusFilter;
      fetchTenants(params);
    }, 300);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    const params: Record<string, string> = {};
    if (value !== 'all') params.status = value;
    if (search) params.search = search;
    fetchTenants(params);
  };

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (tierFilter !== 'all' && t.tier !== tierFilter) return false;
      return true;
    });
  }, [tenants, tierFilter]);

  const handleSuspend = async (reason: string) => {
    if (!suspendTarget) return;
    try {
      await suspendTenant(suspendTarget.id, reason);
      toast.success(`${suspendTarget.name} has been suspended.`);
      fetchTenants();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to suspend tenant.';
      toast.error(msg);
    }
  };

  const handleActivate = async (tenant: Tenant) => {
    try {
      await updateTenantStatus(tenant.id, 'active');
      toast.success(`${tenant.name} has been activated.`);
      fetchTenants();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to activate tenant.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Schools" description="Manage all tenant schools on the platform" />
        <Button onClick={() => router.push('/superadmin/onboard')}>
          <Plus className="mr-2 h-4 w-4" /> Onboard School
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: unknown) => handleStatusFilterChange(v as string)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={(v: unknown) => { if (v) setTierFilter(v as string); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>MRR</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenantsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading tenants...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No tenants found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.name || 'Unnamed School'}</p>
                      <p className="text-xs text-muted-foreground">{tenant.adminEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[tenant.status]}>{tenant.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={TIER_STYLES[tenant.tier] || ''}>{tenant.tier}</Badge>
                  </TableCell>
                  <TableCell>{tenant.studentCount}</TableCell>
                  <TableCell>
                    {tenant.status === 'trial' || tenant.status === 'suspended'
                      ? '—'
                      : formatCurrency(tenant.mrr)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => router.push(`/superadmin/schools/${tenant.id}`)}
                        >
                          View Details
                        </DropdownMenuItem>
                        {tenant.status !== 'suspended' ? (
                          <DropdownMenuItem onSelect={() => setSuspendTarget(tenant)}>
                            Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => handleActivate(tenant)}>
                            Activate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        {filtered.length} of {tenantsTotal || tenants.length} tenant(s)
      </p>

      <SuspendTenantDialog
        tenantName={suspendTarget?.name ?? ''}
        open={!!suspendTarget}
        onOpenChange={(open) => { if (!open) setSuspendTarget(null); }}
        onConfirm={handleSuspend}
      />
    </div>
  );
}
