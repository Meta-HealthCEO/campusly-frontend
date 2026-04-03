'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { BookingStatusBadge } from './BookingStatusBadge';
import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import type { ConferenceBooking } from '@/types';

interface BookingTableProps {
  bookings: ConferenceBooking[];
  onCancel?: (booking: ConferenceBooking) => void;
  onMarkStatus?: (booking: ConferenceBooking, status: 'completed' | 'no_show') => void;
  showTeacher?: boolean;
  showParent?: boolean;
}

export function BookingTable({
  bookings,
  onCancel,
  onMarkStatus,
  showTeacher = true,
  showParent = true,
}: BookingTableProps) {
  const columns = useMemo<ColumnDef<ConferenceBooking, unknown>[]>(() => {
    const cols: ColumnDef<ConferenceBooking, unknown>[] = [
      {
        accessorKey: 'slotStartTime',
        header: 'Time',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {row.original.slotStartTime} – {row.original.slotEndTime}
          </span>
        ),
      },
    ];

    if (showTeacher) {
      cols.push({
        id: 'teacher',
        header: 'Teacher',
        cell: ({ row }) => {
          const t = row.original.teacherId;
          return <span className="truncate">{t.firstName} {t.lastName}</span>;
        },
      });
    }

    if (showParent) {
      cols.push({
        id: 'parent',
        header: 'Parent',
        cell: ({ row }) => {
          const p = row.original.parentId;
          return <span className="truncate">{p.firstName} {p.lastName}</span>;
        },
      });
    }

    cols.push(
      {
        id: 'student',
        header: 'Student',
        cell: ({ row }) => {
          const s = row.original.studentId;
          return <span className="truncate">{s.firstName} {s.lastName}</span>;
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <BookingStatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const b = row.original;
          if (b.status !== 'confirmed') return null;
          return (
            <div className="flex gap-1">
              {onMarkStatus && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); onMarkStatus(b, 'completed'); }}
                  >
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); onMarkStatus(b, 'no_show'); }}
                  >
                    No Show
                  </Button>
                </>
              )}
              {onCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); onCancel(b); }}
                >
                  Cancel
                </Button>
              )}
            </div>
          );
        },
      },
    );

    return cols;
  }, [showTeacher, showParent, onCancel, onMarkStatus]);

  return <DataTable columns={columns} data={bookings} searchKey="slotStartTime" searchPlaceholder="Search by time..." />;
}
