'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/shared/DataTable';
import { Button, buttonVariants } from '@/components/ui/button';
import { LeaveStatusBadge } from './LeaveStatusBadge';
import { LeaveTypeBadge } from './LeaveTypeBadge';
import { Eye, XCircle, UserCheck } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { LeaveRequest } from '@/types';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface LeaveRequestTableProps {
  requests: LeaveRequest[];
  onReview?: (request: LeaveRequest) => void;
  onCancel?: (request: LeaveRequest) => void;
  showStaffName?: boolean;
}

export function LeaveRequestTable({
  requests,
  onReview,
  onCancel,
  showStaffName = true,
}: LeaveRequestTableProps) {
  const columns = useMemo<ColumnDef<LeaveRequest, unknown>[]>(() => {
    const cols: ColumnDef<LeaveRequest, unknown>[] = [];

    if (showStaffName) {
      cols.push({
        accessorKey: 'staffId',
        header: 'Staff Member',
        cell: ({ row }) => {
          const staff = row.original.staffId;
          return (
            <span className="truncate font-medium">
              {staff.firstName} {staff.lastName}
            </span>
          );
        },
      });
    }

    cols.push(
      {
        accessorKey: 'leaveType',
        header: 'Type',
        cell: ({ row }) => <LeaveTypeBadge type={row.original.leaveType} />,
      },
      {
        accessorKey: 'startDate',
        header: 'Dates',
        cell: ({ row }) => {
          const r = row.original;
          const start = new Date(r.startDate).toLocaleDateString();
          const end = new Date(r.endDate).toLocaleDateString();
          return (
            <span className="text-sm">
              {start === end ? start : `${start} - ${end}`}
              {r.isHalfDay && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({r.halfDayPeriod === 'morning' ? 'AM' : 'PM'})
                </span>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: 'workingDays',
        header: 'Days',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.workingDays}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <LeaveStatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-1">
              {onReview && r.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => onReview(r)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Review
                </Button>
              )}
              {onCancel && r.status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => onCancel(r)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
              )}
              {r.status === 'approved' && !r.substituteTeacherId && (
                <Link
                  href={`${ROUTES.ADMIN_SUBSTITUTES}?date=${encodeURIComponent(r.startDate)}&teacherId=${r.staffId.id}&leaveRequestId=${r.id}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  Arrange Substitute
                </Link>
              )}
            </div>
          );
        },
      },
    );

    return cols;
  }, [showStaffName, onReview, onCancel]);

  return <DataTable columns={columns} data={requests} searchKey="staffId" searchPlaceholder="Search requests..." />;
}
