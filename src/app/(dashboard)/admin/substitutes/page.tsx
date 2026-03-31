'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { SubstituteForm } from '@/components/attendance/SubstituteForm';
import type { SchoolClass } from '@/types';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface SubstituteRecord {
  _id: string;
  originalTeacherId: { _id: string; firstName?: string; lastName?: string } | string;
  substituteTeacherId: { _id: string; firstName?: string; lastName?: string } | string;
  date: string;
  periods: number[];
  reason: string;
  classIds: ({ _id: string; name?: string } | string)[];
  approvedBy?: { firstName?: string; lastName?: string } | string;
  createdAt: string;
}

function getTeacherName(teacher: SubstituteRecord['originalTeacherId']): string {
  if (typeof teacher === 'object' && teacher !== null) {
    return `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`.trim() || 'Unknown';
  }
  return 'Unknown';
}

function getClassNames(classIds: SubstituteRecord['classIds']): string {
  return classIds
    .map((c) => (typeof c === 'object' && c !== null ? c.name ?? '' : ''))
    .filter(Boolean)
    .join(', ') || '-';
}

const columns: ColumnDef<SubstituteRecord, unknown>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: 'originalTeacherId',
    header: 'Original Teacher',
    cell: ({ row }) => getTeacherName(row.original.originalTeacherId),
  },
  {
    accessorKey: 'substituteTeacherId',
    header: 'Substitute',
    cell: ({ row }) => getTeacherName(row.original.substituteTeacherId),
  },
  {
    accessorKey: 'periods',
    header: 'Periods',
    cell: ({ row }) => row.original.periods.map((p) => `P${p}`).join(', '),
  },
  {
    accessorKey: 'classIds',
    header: 'Classes',
    cell: ({ row }) => getClassNames(row.original.classIds),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="text-sm line-clamp-1">{row.original.reason}</span>
    ),
  },
];

export default function AdminSubstitutesPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<SubstituteRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const fetchSubstitutes = async () => {
    try {
      const params: Record<string, string> = { schoolId: user?.schoolId ?? '' };
      if (dateFilter) params.date = new Date(dateFilter).toISOString();
      const res = await apiClient.get('/attendance/substitutes', { params });
      const raw = res.data.data ?? res.data;
      const arr = Array.isArray(raw) ? raw : raw.data ?? [];
      setRecords(arr);
    } catch {
      console.error('Failed to load substitute assignments');
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [, staffRes, classesRes] = await Promise.allSettled([
          fetchSubstitutes(),
          apiClient.get('/staff'),
          apiClient.get('/academic/classes'),
        ]);
        if (staffRes.status === 'fulfilled') {
          const d = staffRes.value.data.data ?? staffRes.value.data;
          const arr = Array.isArray(d) ? d : d.data ?? [];
          setStaff(arr.map((s: Record<string, unknown>) => {
            const u = s.user as Record<string, unknown> | undefined;
            return {
              id: (s.id ?? s._id ?? s.userId) as string,
              firstName: (u?.firstName ?? s.firstName ?? '') as string,
              lastName: (u?.lastName ?? s.lastName ?? '') as string,
            };
          }));
        }
        if (classesRes.status === 'fulfilled') {
          const d = classesRes.value.data.data ?? classesRes.value.data;
          const arr = Array.isArray(d) ? d : d.data ?? [];
          setClasses(arr.map((c: Record<string, unknown>) => ({ ...c, id: (c.id ?? c._id) as string })));
        }
      } catch {
        console.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.schoolId]);

  useEffect(() => {
    if (!loading) {
      fetchSubstitutes();
    }
  }, [dateFilter]);

  const handleSubmit = async (data: {
    originalTeacherId: string;
    substituteTeacherId: string;
    date: string;
    reason: string;
    periods: number[];
    classIds: string[];
  }) => {
    try {
      await apiClient.post('/attendance/substitutes', {
        ...data,
        schoolId: user?.schoolId,
      });
      toast.success('Substitute assigned');
      setOpen(false);
      await fetchSubstitutes();
    } catch {
      toast.error('Failed to assign substitute');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/attendance/substitutes/${id}`);
      toast.success('Substitute assignment deleted');
      await fetchSubstitutes();
    } catch {
      toast.error('Failed to delete assignment');
    }
  };

  const actionColumns: ColumnDef<SubstituteRecord, unknown>[] = [
    ...columns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="ghost"
          className="text-red-500 hover:text-red-700"
          onClick={() => handleDelete(row.original._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Substitute Teachers"
        description="Manage substitute teacher assignments"
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Substitute
        </Button>
      </PageHeader>

      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-40"
          placeholder="Filter by date"
        />
        {dateFilter && (
          <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={actionColumns}
        data={records}
        searchKey="reason"
        searchPlaceholder="Search by reason..."
      />

      <SubstituteForm
        open={open}
        onOpenChange={setOpen}
        staff={staff}
        classes={classes}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
