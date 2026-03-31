'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  BusRoute, TransportAssignment, PopulatedStudent, PopulatedRoute,
} from '@/hooks/useTransport';

interface SimpleStudent {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

interface AssignmentsTabProps {
  assignments: TransportAssignment[];
  routes: BusRoute[];
  onCreateAssignment: (data: {
    studentId: string; busRouteId: string; stopName: string;
    direction: 'morning' | 'afternoon' | 'both';
  }) => Promise<void>;
  onUpdateAssignment: (id: string, data: {
    busRouteId?: string; stopName?: string;
    direction?: 'morning' | 'afternoon' | 'both';
  }) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onFilterByRoute: (routeId?: string) => Promise<void>;
}

function getStudentName(s: PopulatedStudent | string): string {
  if (typeof s === 'string') return s;
  const first = s.userId && typeof s.userId === 'object' ? s.userId.firstName ?? '' : '';
  const last = s.userId && typeof s.userId === 'object' ? s.userId.lastName ?? '' : '';
  return `${first} ${last}`.trim() || s.admissionNumber || s._id;
}

function getRouteName(r: PopulatedRoute | string): string {
  if (typeof r === 'string') return r;
  return r.name ?? r._id;
}

const DIRECTION_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  both: 'Both',
};

export function AssignmentsTab({
  assignments, routes, onCreateAssignment, onUpdateAssignment,
  onDeleteAssignment, onFilterByRoute,
}: AssignmentsTabProps) {
  const { user } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const [students, setStudents] = useState<SimpleStudent[]>([]);
  const [filterRouteId, setFilterRouteId] = useState('');
  const [editTarget, setEditTarget] = useState<TransportAssignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransportAssignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedStop, setSelectedStop] = useState('');
  const [selectedDirection, setSelectedDirection] = useState<'morning' | 'afternoon' | 'both'>('both');
  const [submitting, setSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const activeRoutes = routes.filter((r) => r.isActive);
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await apiClient.get('/students', {
        params: { schoolId: user?.schoolId ?? '' },
      });
      const raw = res.data.data ?? res.data;
      const arr = Array.isArray(raw) ? raw : raw.students ?? raw.data ?? [];
      setStudents(arr.map((s: Record<string, unknown>) => {
        const u = s.userId as Record<string, unknown> | undefined;
        return {
          id: (s._id as string) ?? (s.id as string),
          firstName: (u?.firstName as string) ?? '',
          lastName: (u?.lastName as string) ?? '',
          admissionNumber: (s.admissionNumber as string) ?? '',
        };
      }));
    } catch {
      console.error('Failed to load students');
    }
  }, [user?.schoolId]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleFilterChange = (val: unknown) => {
    const routeId = val === 'all' ? '' : (val as string);
    setFilterRouteId(routeId);
    onFilterByRoute(routeId || undefined);
  };

  const openCreateForm = () => {
    setEditTarget(null);
    setSelectedStudentId('');
    setSelectedRouteId('');
    setSelectedStop('');
    setSelectedDirection('both');
    setFormOpen(true);
  };

  const openEditForm = (assignment: TransportAssignment) => {
    setEditTarget(assignment);
    const routeId = typeof assignment.busRouteId === 'string'
      ? assignment.busRouteId : assignment.busRouteId._id;
    setSelectedRouteId(routeId);
    setSelectedStop(assignment.stopName);
    setSelectedDirection(assignment.direction);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editTarget) {
        await onUpdateAssignment(editTarget.id, {
          busRouteId: selectedRouteId,
          stopName: selectedStop,
          direction: selectedDirection,
        });
      } else {
        if (!selectedStudentId || !selectedRouteId || !selectedStop) return;
        await onCreateAssignment({
          studentId: selectedStudentId,
          busRouteId: selectedRouteId,
          stopName: selectedStop,
          direction: selectedDirection,
        });
      }
      setFormOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteAssignment(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return !q || s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.admissionNumber.toLowerCase().includes(q);
  });

  const columns: ColumnDef<TransportAssignment, unknown>[] = [
    {
      accessorKey: 'studentId',
      header: 'Student',
      cell: ({ row }) => getStudentName(row.original.studentId),
    },
    {
      accessorKey: 'busRouteId',
      header: 'Route',
      cell: ({ row }) => getRouteName(row.original.busRouteId),
    },
    { accessorKey: 'stopName', header: 'Stop' },
    {
      accessorKey: 'direction',
      header: 'Direction',
      cell: ({ row }) => (
        <Badge variant="secondary">{DIRECTION_LABELS[row.original.direction] ?? row.original.direction}</Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEditForm(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleteTarget(row.original)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Filter by route:</Label>
          <Select value={filterRouteId || 'all'} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routes</SelectItem>
              {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" /> Assign Student
        </Button>
      </div>

      {assignments.length === 0 ? (
        <EmptyState icon={UserPlus} title="No assignments" description="No students have been assigned to routes yet." />
      ) : (
        <DataTable columns={columns} data={assignments} searchKey="stopName" searchPlaceholder="Search by stop..." />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Assignment' : 'Assign Student to Route'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update the route assignment.' : 'Select a student, route, stop, and direction.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editTarget && (
              <div className="space-y-2">
                <Label>Student</Label>
                <Input
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                <Select value={selectedStudentId} onValueChange={(val: unknown) => setSelectedStudentId(val as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {filteredStudents.slice(0, 50).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Route</Label>
              <Select value={selectedRouteId} onValueChange={(val: unknown) => { setSelectedRouteId(val as string); setSelectedStop(''); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select route" /></SelectTrigger>
                <SelectContent>
                  {activeRoutes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedRoute && (
              <div className="space-y-2">
                <Label>Boarding Stop</Label>
                <Select value={selectedStop} onValueChange={(val: unknown) => setSelectedStop(val as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select stop" /></SelectTrigger>
                  <SelectContent>
                    {selectedRoute.stops.map((s) => (
                      <SelectItem key={s.name} value={s.name}>{s.name} ({s.time})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={selectedDirection} onValueChange={(val: unknown) => setSelectedDirection(val as 'morning' | 'afternoon' | 'both')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editTarget ? 'Update' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this student assignment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
