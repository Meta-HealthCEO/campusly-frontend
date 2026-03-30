'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { mockTenants } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import type { TenantStatus, SubscriptionTier } from '@/types';

const STATUS_COLORS: Record<TenantStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  enterprise: 'bg-purple-100 text-purple-700',
  growth: 'bg-indigo-100 text-indigo-700',
  starter: 'bg-amber-100 text-amber-700',
};

export default function SuperAdminSchoolsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return mockTenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.adminEmail.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesTier = tierFilter === 'all' || t.tier === tierFilter;
      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [search, statusFilter, tierFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Schools" description="Manage all tenant schools on the platform" />
        <Link href="/superadmin/onboard"><Button>
            <Plus className="mr-2 h-4 w-4" /> Onboard School
          </Button></Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { if (v !== null) setStatusFilter(v); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={(v) => { if (v !== null) setTierFilter(v); }}>
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
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No schools found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.adminEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[tenant.status]}`}>
                      {tenant.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_COLORS[tenant.tier]}`}>
                      {tenant.tier}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{tenant.studentCount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {tenant.status === 'trial' || tenant.status === 'suspended'
                      ? <span className="text-muted-foreground">—</span>
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
                        <DropdownMenuItem>
                          <Link href={`/superadmin/schools/${tenant.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {tenant.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} school(s)</p>
    </div>
  );
}

