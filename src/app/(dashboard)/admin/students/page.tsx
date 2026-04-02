'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ExportButton } from '@/components/shared/ExportButton';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { BulkImportDialog } from '@/components/students/BulkImportDialog';
import { useStudents } from '@/hooks/useStudents';
import { useStudentBulkImport } from '@/hooks/useStudentBulkImport';
import type { Student } from '@/types';

function getStudentName(row: Student): string {
  const u = row.user ?? (row.userId as unknown as { firstName?: string; lastName?: string });
  const first = (typeof u === 'object' && u !== null ? u.firstName : undefined) ?? row.firstName ?? '';
  const last = (typeof u === 'object' && u !== null ? u.lastName : undefined) ?? row.lastName ?? '';
  const name = `${first} ${last}`.trim();
  return name || row.admissionNumber || 'Unknown Student';
}

function getPopulatedName(obj: unknown, fallback?: string): string {
  if (typeof obj === 'object' && obj !== null && 'name' in obj) return (obj as { name: string }).name;
  return fallback ?? '-';
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  transferred: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  graduated: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  expelled: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const columns: ColumnDef<Student>[] = [
  {
    id: 'avatar',
    header: '',
    cell: ({ row }) => (
      <StudentAvatar
        photoUrl={row.original.photoUrl}
        name={getStudentName(row.original)}
        size="sm"
      />
    ),
    size: 48,
  },
  { accessorKey: 'admissionNumber', header: 'Admission No' },
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => getStudentName(row),
  },
  {
    id: 'grade',
    header: 'Grade',
    accessorFn: (row) => getPopulatedName(row.grade ?? row.gradeId),
  },
  {
    id: 'class',
    header: 'Class',
    accessorFn: (row) => getPopulatedName(row.class ?? row.classId),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.enrollmentStatus ?? 'active';
      return (
        <Badge className={statusStyles[status] ?? statusStyles.active}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
];

export default function StudentsPage() {
  const router = useRouter();
  const { students, loading, refetch } = useStudents();
  const { uploadAndValidate, confirmImport, downloadTemplate, validating, importing } =
    useStudentBulkImport();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Students" description="Manage student enrolments and profiles">
        <BulkImportDialog
          onDownloadTemplate={downloadTemplate}
          onValidate={uploadAndValidate}
          onImport={confirmImport}
          validating={validating}
          importing={importing}
          onSuccess={refetch}
        />
        <ExportButton endpoint="/students/export" filename="students.csv" />
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
        onRowClick={(student) => router.push(`/admin/students/${student.id}`)}
      />
    </div>
  );
}
