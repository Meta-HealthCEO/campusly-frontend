'use client';

import { useMemo } from 'react';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionBadge } from './PermissionBadge';
import { Pencil } from 'lucide-react';
import type { PermissionUser } from '@/types';

interface PermissionUserTableProps {
  users: PermissionUser[];
  onEdit: (user: PermissionUser) => void;
}

export function PermissionUserTable({ users, onEdit }: PermissionUserTableProps) {
  const columns = useMemo<ColumnDef<PermissionUser, unknown>[]>(() => [
    {
      accessorKey: 'firstName',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium truncate">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="truncate text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.role === 'school_admin' ? 'Admin' : 'Teacher'}
        </Badge>
      ),
    },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => {
        const u = row.original;
        const badges: Array<{ type: 'principal' | 'hod' | 'bursar' | 'receptionist' | 'counselor' }> = [];
        if (u.isSchoolPrincipal) badges.push({ type: 'principal' });
        if (u.isHOD) badges.push({ type: 'hod' });
        if (u.isBursar) badges.push({ type: 'bursar' });
        if (u.isReceptionist) badges.push({ type: 'receptionist' });
        if (u.isCounselor) badges.push({ type: 'counselor' });

        if (badges.length === 0) {
          return <span className="text-muted-foreground text-xs">None</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {badges.map((b) => (
              <PermissionBadge key={b.type} type={b.type} />
            ))}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original);
          }}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      ),
    },
  ], [onEdit]);

  return (
    <DataTable
      columns={columns}
      data={users}
      searchKey="firstName"
      searchPlaceholder="Search staff..."
    />
  );
}
