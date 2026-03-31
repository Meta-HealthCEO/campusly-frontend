'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { SubscriptionBadge } from '@/components/school';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { useSchoolStore } from '@/stores/useSchoolStore';
import type { SchoolDocument } from '@/types';

function StatusBadge({ isActive, isDeleted }: { isActive: boolean; isDeleted: boolean }) {
  if (isDeleted) {
    return <Badge className="bg-gray-100 text-gray-700">Deleted</Badge>;
  }
  if (!isActive) {
    return <Badge className="bg-red-100 text-red-700">Suspended</Badge>;
  }
  return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
}

export default function SuperAdminSchoolsPage() {
  const router = useRouter();
  const { schools, schoolsLoading, fetchSchools, updateSchool } = useSchoolStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleSearchChange = (term: string) => {
    setSearch(term);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSchools({ search: term });
    }, 300);
  };

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      if (statusFilter === 'active' && (!s.isActive || s.isDeleted)) return false;
      if (statusFilter === 'suspended' && (s.isActive || s.isDeleted)) return false;
      if (tierFilter !== 'all' && s.subscription?.tier !== tierFilter) return false;
      return true;
    });
  }, [schools, statusFilter, tierFilter]);

  const handleToggleStatus = async (school: SchoolDocument) => {
    const newActive = !school.isActive;
    try {
      await updateSchool(school.id, { isActive: newActive });
      await fetchSchools({ search });
      toast.success(`${school.name} has been ${newActive ? 'activated' : 'suspended'}.`);
    } catch {
      toast.error(`Failed to update ${school.name}.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Schools" description="Manage all tenant schools on the platform" />
        <Button onClick={() => router.push('/superadmin/onboard')}>
          <Plus className="mr-2 h-4 w-4" />
          Onboard School
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
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                if (v) setStatusFilter(v);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={tierFilter}
              onValueChange={(v) => {
                if (v) setTierFilter(v);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
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
              <TableHead>City</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {schoolsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Loading schools...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No schools found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((school) => (
                <TableRow key={school.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{school.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {school.contactInfo?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge isActive={school.isActive} isDeleted={school.isDeleted} />
                  </TableCell>
                  <TableCell>
                    {school.subscription ? (
                      <SubscriptionBadge
                        tier={school.subscription.tier}
                        expiresAt={school.subscription.expiresAt}
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>{school.address?.city ?? '—'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => router.push(`/superadmin/schools/${school.id}`)}
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleToggleStatus(school)}>
                          {school.isActive ? 'Suspend' : 'Activate'}
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
