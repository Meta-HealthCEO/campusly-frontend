'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, LogIn, LogOut, MapPinned } from 'lucide-react';
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
import type { BusRoute, BoardingLog, PopulatedStudent, PopulatedRoute } from '@/hooks/useTransport';

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

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface BoardingLogsTabProps {
  boardingLogs: BoardingLog[];
  routes: BusRoute[];
  onFetchLogs: (filters?: { routeId?: string; studentId?: string; date?: string }) => Promise<void>;
  onCreateLog: (data: {
    studentId: string; routeId: string; boardedAt: string;
    boardingLat?: number; boardingLng?: number;
  }) => Promise<void>;
  onLogAlight: (id: string, data: {
    alightedAt: string; alightingLat?: number; alightingLng?: number;
  }) => Promise<void>;
}

export function BoardingLogsTab({
  boardingLogs, routes, onFetchLogs, onCreateLog, onLogAlight,
}: BoardingLogsTabProps) {
  const today = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(today);
  const [filterRouteId, setFilterRouteId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [alightTarget, setAlightTarget] = useState<BoardingLog | null>(null);

  // Create form
  const [newStudentId, setNewStudentId] = useState('');
  const [newRouteId, setNewRouteId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const applyFilters = (date?: string, routeId?: string) => {
    const d = date ?? filterDate;
    const r = routeId ?? filterRouteId;
    onFetchLogs({
      date: d || undefined,
      routeId: r || undefined,
    });
  };

  const handleDateChange = (val: string) => {
    setFilterDate(val);
    applyFilters(val, filterRouteId);
  };

  const handleRouteFilterChange = (val: unknown) => {
    const routeId = val === 'all' ? '' : (val as string);
    setFilterRouteId(routeId);
    applyFilters(filterDate, routeId);
  };

  const handleCreateLog = async () => {
    if (!newStudentId || !newRouteId) return;
    setSubmitting(true);
    try {
      await onCreateLog({
        studentId: newStudentId,
        routeId: newRouteId,
        boardedAt: new Date().toISOString(),
      });
      setCreateOpen(false);
      setNewStudentId('');
      setNewRouteId('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAlight = async () => {
    if (!alightTarget) return;
    setSubmitting(true);
    try {
      await onLogAlight(alightTarget.id, { alightedAt: new Date().toISOString() });
      setAlightTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<BoardingLog, unknown>[] = [
    {
      accessorKey: 'studentId',
      header: 'Student',
      cell: ({ row }) => getStudentName(row.original.studentId),
    },
    {
      accessorKey: 'routeId',
      header: 'Route',
      cell: ({ row }) => getRouteName(row.original.routeId),
    },
    {
      accessorKey: 'boardedAt',
      header: 'Boarded At',
      cell: ({ row }) => formatTime(row.original.boardedAt),
    },
    {
      accessorKey: 'alightedAt',
      header: 'Alighted At',
      cell: ({ row }) => {
        if (row.original.alightedAt) return formatTime(row.original.alightedAt);
        return <Badge className="bg-amber-100 text-amber-700">On Bus</Badge>;
      },
    },
    {
      id: 'gps',
      header: 'GPS',
      cell: ({ row }) => {
        const hasGps = row.original.boardingLat != null || row.original.alightingLat != null;
        return hasGps ? <MapPinned className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground">-</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (row.original.alightedAt) return null;
        return (
          <Button variant="outline" size="sm" onClick={() => setAlightTarget(row.original)}>
            <LogOut className="h-3.5 w-3.5 mr-1" /> Log Alight
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm shrink-0">Date:</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm shrink-0">Route:</Label>
            <Select value={filterRouteId || 'all'} onValueChange={handleRouteFilterChange}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Log Boarding
        </Button>
      </div>

      {boardingLogs.length === 0 ? (
        <EmptyState icon={LogIn} title="No boarding logs" description="No boarding activity recorded for the selected filters." />
      ) : (
        <DataTable columns={columns} data={boardingLogs} />
      )}

      {/* Create Boarding Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Student Boarding</DialogTitle>
            <DialogDescription>Record a student boarding the bus now.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student ID</Label>
              <Input
                placeholder="Enter student ID"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Route</Label>
              <Select value={newRouteId} onValueChange={(val: unknown) => setNewRouteId(val as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select route" /></SelectTrigger>
                <SelectContent>
                  {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateLog} disabled={submitting || !newStudentId || !newRouteId}>
              {submitting ? 'Logging...' : 'Log Boarding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alight Confirmation */}
      <Dialog open={!!alightTarget} onOpenChange={() => setAlightTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Alighting</DialogTitle>
            <DialogDescription>
              Confirm that {alightTarget ? getStudentName(alightTarget.studentId) : 'the student'} has alighted the bus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlightTarget(null)}>Cancel</Button>
            <Button onClick={handleAlight} disabled={submitting}>
              {submitting ? 'Logging...' : 'Confirm Alight'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
