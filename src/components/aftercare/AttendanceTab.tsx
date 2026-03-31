'use client';

import { useState } from 'react';
import { LogOut, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { AfterCareAttendance, StudentOption } from '@/hooks/useAftercare';
import { getStudentName, getStudentGrade } from '@/hooks/useAftercare';

interface AttendanceTabProps {
  attendance: AfterCareAttendance[];
  students: StudentOption[];
  onCheckIn: (data: {
    studentId: string;
    date: string;
    checkInTime: string;
    notes?: string;
  }) => Promise<void>;
  onCheckOut: (id: string, checkOutTime: string, notes?: string) => Promise<void>;
}

export function AttendanceTab({ attendance, students, onCheckIn, onCheckOut }: AttendanceTabProps) {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const now = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleCheckOut = async (record: AfterCareAttendance) => {
    try {
      await onCheckOut(record.id, now());
    } catch {
      toast.error('Failed to check out student');
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) { toast.error('Please select a student'); return; }
    setSubmitting(true);
    try {
      await onCheckIn({
        studentId,
        date: new Date().toISOString(),
        checkInTime: checkInTime || now(),
        notes: notes || undefined,
      });
      setStudentId('');
      setCheckInTime('');
      setNotes('');
      setCheckInOpen(false);
    } catch {
      toast.error('Failed to check in student');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<AfterCareAttendance>[] = [
    {
      accessorKey: 'studentName',
      header: 'Student',
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
    { accessorKey: 'checkInTime', header: 'Check In' },
    {
      id: 'checkOut',
      header: 'Check Out',
      cell: ({ row }) =>
        row.original.checkOutTime ?? (
          <span className="text-muted-foreground italic">Still here</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const checkedOut = !!row.original.checkOutTime;
        return (
          <Badge
            variant="secondary"
            className={checkedOut ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}
          >
            {checkedOut ? 'Checked Out' : 'Checked In'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (!row.original.checkOutTime) {
          return (
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleCheckOut(row.original)}
            >
              <LogOut className="mr-1 h-3 w-3" /> Check Out
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCheckInOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Check In Student
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={attendance}
        searchKey="studentName"
        searchPlaceholder="Search attendance..."
      />

      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Student</DialogTitle>
            <DialogDescription>Record a student check-in for after care.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={(v: unknown) => setStudentId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.grade ? `(${s.grade})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Check-In Time</Label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder={now()}
              />
              <p className="text-xs text-muted-foreground">Leave empty to use current time</p>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCheckInOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Checking in...' : 'Check In'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
