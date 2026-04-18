'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Trash2, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface DisciplineRecord {
  _id: string;
  studentId: {
    _id: string;
    userId?: { firstName?: string; lastName?: string };
    admissionNumber?: string;
  } | string;
  reportedBy?: {
    firstName?: string;
    lastName?: string;
  };
  type: string;
  severity: string;
  description: string;
  status: string;
  outcome?: string;
  parentNotified?: boolean;
  createdAt: string;
}

const DISCIPLINE_STATUS_OPTIONS = [
  { value: 'reported', label: 'Reported' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated', label: 'Escalated' },
];

interface DisciplineTableProps {
  records: DisciplineRecord[];
  canDelete: boolean;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  minor: 'bg-slate-100 text-slate-700',
  moderate: 'bg-amber-100 text-amber-700',
  serious: 'bg-orange-100 text-orange-700',
  critical: 'bg-destructive/10 text-destructive',
};

const STATUS_STYLES: Record<string, string> = {
  reported: 'bg-blue-100 text-blue-700',
  investigating: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  escalated: 'bg-destructive/10 text-destructive',
};

function getStudentName(record: DisciplineRecord): string {
  if (typeof record.studentId === 'object' && record.studentId !== null) {
    const s = record.studentId;
    const u = s.userId;
    if (u && typeof u === 'object') {
      return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    }
    return s.admissionNumber || 'Unknown';
  }
  return 'Unknown';
}

function buildColumns(
  canDelete: boolean,
  onDelete?: (id: string) => void,
  onView?: (id: string) => void,
  onStatusChange?: (id: string, status: string) => void,
): ColumnDef<DisciplineRecord, unknown>[] {
  const cols: ColumnDef<DisciplineRecord, unknown>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      accessorKey: 'studentId',
      header: 'Student',
      cell: ({ row }) => getStudentName(row.original),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="capitalize">{row.original.type.replace('_', ' ')}</span>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => (
        <Badge variant="secondary" className={SEVERITY_STYLES[row.original.severity] ?? ''}>
          {row.original.severity}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) =>
        onStatusChange ? (
          <Select
            value={row.original.status}
            onValueChange={(val: unknown) =>
              onStatusChange(row.original._id, val as string)
            }
          >
            <SelectTrigger className="h-8 w-full sm:w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISCIPLINE_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className={STATUS_STYLES[row.original.status] ?? ''}>
            {row.original.status}
          </Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {onView && (
            <Button size="icon" variant="ghost" onClick={() => onView(row.original._id)} aria-label="View record">
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {canDelete && onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(row.original._id)}
              aria-label="Delete record"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];
  return cols;
}

export function DisciplineTable({ records, canDelete, onDelete, onView, onStatusChange }: DisciplineTableProps) {
  const columns = buildColumns(canDelete, onDelete, onView, onStatusChange);

  return (
    <DataTable
      columns={columns}
      data={records}
      searchKey="type"
      searchPlaceholder="Search by type..."
    />
  );
}
