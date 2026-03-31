'use client';

import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useStaff } from '@/hooks/useAcademics';
import type { User } from '@/types';

const roleStyles: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  teacher: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  parent: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  student: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  tuckshop: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

const userColumns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <Badge className={roleStyles[row.original.role] ?? ''}>
        {row.original.role.charAt(0).toUpperCase() + row.original.role.slice(1)}
      </Badge>
    ),
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

export function SchoolUsersTab() {
  const { staff, loading } = useStaff();

  if (loading) return <LoadingSpinner />;

  // Staff members are typed as StaffMember but have same fields as User for display
  const users = staff as unknown as User[];

  return (
    <DataTable
      columns={userColumns}
      data={users}
      searchKey="name"
      searchPlaceholder="Search users..."
    />
  );
}
