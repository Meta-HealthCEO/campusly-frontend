'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';
import type { Student } from '@/types';

const columns: ColumnDef<Student>[] = [
  {
    accessorKey: 'admissionNumber',
    header: 'Admission No',
  },
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => `${row.user?.firstName ?? (row as any).firstName ?? ''} ${row.user?.lastName ?? (row as any).lastName ?? ''}`,
  },
  {
    id: 'grade',
    header: 'Grade',
    accessorFn: (row) => row.grade?.name ?? (row as any).gradeName ?? '-',
  },
  {
    id: 'class',
    header: 'Class',
    accessorFn: (row) => row.class?.name ?? (row as any).className ?? '-',
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        className={
          row.original.isActive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
      >
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.get('/students');
        if (response.data) {
          const data = response.data.data ?? response.data;
          if (Array.isArray(data)) setStudents(data); else if (data?.data) setStudents(data.data);
        }
      } catch {
        console.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Students" description="Manage student enrolments and profiles">
        <Link href="/admin/students/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </Link>
      </PageHeader>

      <DataTable
        columns={columns}
        data={students}
        searchKey="name"
        searchPlaceholder="Search students..."
      />
    </div>
  );
}
