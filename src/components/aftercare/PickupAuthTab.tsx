'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';
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
import type { PickupAuthorization, StudentOption } from '@/hooks/useAftercare';
import { getStudentName } from '@/hooks/useAftercare';

interface PickupAuthTabProps {
  pickupAuths: PickupAuthorization[];
  students: StudentOption[];
  onCreate: (data: {
    studentId: string;
    authorizedPersonName: string;
    idNumber: string;
    relationship: string;
    phoneNumber: string;
  }) => Promise<void>;
  onUpdate: (id: string, data: Partial<{
    authorizedPersonName: string;
    idNumber: string;
    relationship: string;
    phoneNumber: string;
    isActive: boolean;
  }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PickupAuthTab({
  pickupAuths, students, onCreate, onUpdate, onDelete,
}: PickupAuthTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PickupAuthorization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PickupAuthorization | null>(null);

  // form state
  const [studentId, setStudentId] = useState('');
  const [personName, setPersonName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setStudentId('');
    setPersonName('');
    setIdNumber('');
    setRelationship('');
    setPhoneNumber('');
    setEditTarget(null);
  };

  const openEdit = (pa: PickupAuthorization) => {
    setEditTarget(pa);
    const sid = typeof pa.studentId === 'string' ? pa.studentId : pa.studentId._id;
    setStudentId(sid);
    setPersonName(pa.authorizedPersonName);
    setIdNumber(pa.idNumber);
    setRelationship(pa.relationship);
    setPhoneNumber(pa.phoneNumber);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !idNumber || !relationship || !phoneNumber) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      if (editTarget) {
        await onUpdate(editTarget.id, {
          authorizedPersonName: personName,
          idNumber,
          relationship,
          phoneNumber,
        });
      } else {
        if (!studentId) { toast.error('Please select a student'); setSubmitting(false); return; }
        await onCreate({ studentId, authorizedPersonName: personName, idNumber, relationship, phoneNumber });
      }
      resetForm();
      setFormOpen(false);
    } catch {
      toast.error('Failed to save pickup authorization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    }
    setDeleteTarget(null);
  };

  const columns: ColumnDef<PickupAuthorization>[] = [
    {
      accessorKey: 'studentName',
      header: 'Student',
      accessorFn: (row) => getStudentName(row.studentId),
      cell: ({ row }) => <span className="font-medium">{getStudentName(row.original.studentId)}</span>,
    },
    { accessorKey: 'authorizedPersonName', header: 'Authorized Person' },
    { accessorKey: 'idNumber', header: 'ID Number' },
    { accessorKey: 'relationship', header: 'Relationship' },
    { accessorKey: 'phoneNumber', header: 'Phone' },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={row.original.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}
        >
          {row.original.isActive ? (
            <><ShieldCheck className="mr-1 h-3 w-3" /> Active</>
          ) : (
            <><ShieldOff className="mr-1 h-3 w-3" /> Inactive</>
          )}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" onClick={() => openEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {row.original.isActive ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={async () => {
                try {
                  await onUpdate(row.original.id, { isActive: false });
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
                    ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                    ?? 'Operation failed';
                  toast.error(msg);
                }
              }}
            >
              <ShieldOff className="h-3.5 w-3.5" />
            </Button>
          ) : (
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
              <ShieldCheck className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="xs" variant="ghost" onClick={() => setDeleteTarget(row.original)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Pickup Person
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={pickupAuths}
        searchKey="authorizedPersonName"
        searchPlaceholder="Search authorized persons..."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) resetForm(); setFormOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit' : 'Add'} Pickup Authorization</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update the authorized pickup person details.' : 'Add a new authorized pickup person for a student.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editTarget && (
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={(v: unknown) => setStudentId(v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ID Number</Label>
                <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="SA ID number" />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select value={relationship} onValueChange={(v: unknown) => setRelationship(v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['Mother', 'Father', 'Guardian', 'Grandparent', 'Sibling', 'Other'].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. 082 123 4567" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setFormOpen(false); }}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editTarget ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pickup Authorization</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deleteTarget?.authorizedPersonName} as an authorized pickup person?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
