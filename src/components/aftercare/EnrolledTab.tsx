'use client';

import { useState } from 'react';
import { Plus, Pencil, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { RegisterStudentDialog } from './RegisterStudentDialog';
import type {
  AfterCareRegistration, StudentOption,
} from '@/hooks/useAftercare';
import { getStudentName, getStudentGrade } from '@/hooks/useAftercare';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const DayCheck = ({ checked }: { checked: boolean }) => (
  <span className={checked ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}>
    {checked ? '\u2713' : '\u2013'}
  </span>
);

interface EnrolledTabProps {
  registrations: AfterCareRegistration[];
  students: StudentOption[];
  onRegister: (data: {
    studentId: string;
    term: number;
    academicYear: number;
    daysPerWeek: string[];
    monthlyFee: number;
  }) => Promise<void>;
  onUpdate: (id: string, data: Partial<{
    term: number;
    academicYear: number;
    daysPerWeek: string[];
    monthlyFee: number;
    isActive: boolean;
  }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreatePickupAuth: (data: {
    studentId: string;
    authorizedPersonName: string;
    idNumber: string;
    relationship: string;
    phoneNumber: string;
  }) => Promise<void>;
}

export function EnrolledTab({
  registrations, students, onRegister, onUpdate, onDelete, onCreatePickupAuth,
}: EnrolledTabProps) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<AfterCareRegistration | null>(null);

  const columns: ColumnDef<AfterCareRegistration>[] = [
    {
      accessorKey: 'studentName',
      header: 'Student Name',
      accessorFn: (row) => getStudentName(row.studentId),
      cell: ({ row }) => (
        <span className="font-medium">{getStudentName(row.original.studentId)}</span>
      ),
    },
    {
      id: 'grade',
      header: 'Grade',
      cell: ({ row }) => getStudentGrade(row.original.studentId),
    },
    ...DAY_LABELS.map((label, i) => ({
      id: WEEKDAYS[i],
      header: label,
      cell: ({ row }: { row: { original: AfterCareRegistration } }) => (
        <DayCheck checked={row.original.daysPerWeek.includes(WEEKDAYS[i])} />
      ),
    })) as ColumnDef<AfterCareRegistration>[],
    {
      id: 'monthlyFee',
      header: 'Monthly Fee',
      cell: ({ row }) => formatCurrency(row.original.monthlyFee),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={row.original.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}
        >
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.isActive && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setDeactivateTarget(row.original)}
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {!row.original.isActive && (
            <Button
              size="xs"
              variant="ghost"
              onClick={async () => {
                try {
                  await onUpdate(row.original.id, { isActive: true });
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
                    ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                    ?? 'Operation failed';
                  toast.error(msg);
                }
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await onUpdate(deactivateTarget.id, { isActive: false });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    }
    setDeactivateTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setRegisterOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Register Student
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={registrations}
        searchKey="studentName"
        searchPlaceholder="Search students..."
      />

      <RegisterStudentDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        students={students}
        onRegister={onRegister}
        onCreatePickupAuth={onCreatePickupAuth}
      />

      <Dialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Registration</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this registration? The student will no longer appear as active in after care.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
