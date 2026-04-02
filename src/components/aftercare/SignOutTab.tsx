'use client';

import { useState, useMemo } from 'react';
import { Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type {
  SignOutLog, AfterCareAttendance, PickupAuthorization, StudentOption,
} from '@/hooks/useAftercare';
import { getStudentName } from '@/hooks/useAftercare';

interface SignOutTabProps {
  signOutLogs: SignOutLog[];
  attendance: AfterCareAttendance[];
  pickupAuths: PickupAuthorization[];
  students: StudentOption[];
  onCreateSignOut: (data: {
    attendanceId: string;
    studentId: string;
    pickedUpBy: string;
    pickedUpAt: string;
    isAuthorized: boolean;
    authorizationId?: string;
    notes?: string;
  }) => Promise<void>;
}

export function SignOutTab({
  signOutLogs, attendance, pickupAuths, onCreateSignOut,
}: SignOutTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attendanceId, setAttendanceId] = useState('');
  const [pickedUpBy, setPickedUpBy] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [authorizationId, setAuthorizationId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Only show checked-in students (still here) as sign-out candidates
  const checkedInRecords = useMemo(
    () => attendance.filter((a) => !a.checkOutTime),
    [attendance],
  );

  const selectedAttendance = useMemo(
    () => attendance.find((a) => a.id === attendanceId),
    [attendance, attendanceId],
  );

  const selectedStudentId = selectedAttendance
    ? (typeof selectedAttendance.studentId === 'string'
        ? selectedAttendance.studentId
        : selectedAttendance.studentId._id)
    : '';

  const studentPickupAuths = useMemo(
    () => pickupAuths.filter((pa) => {
      const paStudentId = typeof pa.studentId === 'string' ? pa.studentId : pa.studentId._id;
      return paStudentId === selectedStudentId && pa.isActive;
    }),
    [pickupAuths, selectedStudentId],
  );

  const resetForm = () => {
    setAttendanceId('');
    setPickedUpBy('');
    setIsAuthorized(true);
    setAuthorizationId('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceId || !pickedUpBy) {
      toast.error('Please fill required fields');
      return;
    }
    setSubmitting(true);
    try {
      await onCreateSignOut({
        attendanceId,
        studentId: selectedStudentId,
        pickedUpBy,
        pickedUpAt: new Date().toISOString(),
        isAuthorized,
        authorizationId: authorizationId || undefined,
        notes: notes || undefined,
      });
      resetForm();
      setDialogOpen(false);
    } catch {
      toast.error('Failed to record sign-out');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<SignOutLog>[] = [
    {
      accessorKey: 'studentName',
      header: 'Student',
      accessorFn: (row) => getStudentName(row.studentId),
      cell: ({ row }) => <span className="font-medium">{getStudentName(row.original.studentId)}</span>,
    },
    { accessorKey: 'pickedUpBy', header: 'Picked Up By' },
    {
      id: 'time',
      header: 'Time',
      cell: ({ row }) => {
        try {
          const d = new Date(row.original.pickedUpAt);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } catch {
          return row.original.pickedUpAt;
        }
      },
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => {
        try {
          return new Date(row.original.pickedUpAt).toLocaleDateString();
        } catch {
          return row.original.pickedUpAt;
        }
      },
    },
    {
      id: 'authorized',
      header: 'Authorized',
      cell: ({ row }) =>
        row.original.isAuthorized ? (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Yes
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive">
            <AlertTriangle className="mr-1 h-3 w-3" /> Unauthorized
          </Badge>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Record Sign-Out
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={signOutLogs}
        searchKey="studentName"
        searchPlaceholder="Search sign-out log..."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Sign-Out</DialogTitle>
            <DialogDescription>Record who is picking up the student.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Student (checked in)</Label>
              <Select value={attendanceId} onValueChange={(v: unknown) => setAttendanceId(v as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {checkedInRecords.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {getStudentName(a.studentId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Picked Up By</Label>
              <Input value={pickedUpBy} onChange={(e) => setPickedUpBy(e.target.value)} placeholder="Name of person" />
            </div>
            {studentPickupAuths.length > 0 && (
              <div className="space-y-2">
                <Label>Match Authorization</Label>
                <Select value={authorizationId} onValueChange={(v: unknown) => {
                  const val = v as string;
                  setAuthorizationId(val);
                  if (val) {
                    const match = studentPickupAuths.find((pa) => pa.id === val);
                    if (match) { setPickedUpBy(match.authorizedPersonName); setIsAuthorized(true); }
                  }
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select authorized person" /></SelectTrigger>
                  <SelectContent>
                    {studentPickupAuths.map((pa) => (
                      <SelectItem key={pa.id} value={pa.id}>
                        {pa.authorizedPersonName} ({pa.relationship})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isAuthorized}
                onCheckedChange={(v) => setIsAuthorized(v === true)}
              />
              Person is authorized
            </label>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Recording...' : 'Record Sign-Out'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
