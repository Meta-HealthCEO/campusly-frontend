'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRosterSearch, type SchoolRosterRow } from '@/hooks/useRosterSearch';

interface AssignStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId?: string;
  currentStudentIds: string[];
  onAssign: (studentId: string, classId: string) => Promise<void>;
}

export function AssignStudentDialog({
  open,
  onOpenChange,
  classId,
  currentStudentIds,
  onAssign,
}: AssignStudentDialogProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search, open]);

  const { rows, loading } = useRosterSearch(debounced, open);

  const available = useMemo(() => {
    const currentSet = new Set(currentStudentIds);
    return rows.filter((r) => !currentSet.has(r.id));
  }, [rows, currentStudentIds]);

  const handleAssign = async (row: SchoolRosterRow) => {
    if (!classId) return;
    setAssigningId(row.id);
    try {
      await onAssign(row.id, classId);
    } finally {
      setAssigningId(null);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSearch('');
      setDebounced('');
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Existing Learner</DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-3 overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or admission number..."
              className="pl-9"
            />
          </div>

          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Searching…</p>
          ) : available.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {debounced
                ? 'No learners in this school match your search.'
                : 'Start typing a name or admission number.'}
            </p>
          ) : (
            <div className="space-y-2">
              {available.map((row) => {
                const currentGroup = row.className ? ` - ${row.className}` : '';
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.firstName} {row.lastName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.admissionNumber}{currentGroup}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={assigningId === row.id || !classId}
                      onClick={() => handleAssign(row)}
                    >
                      {assigningId === row.id ? 'Assigning...' : 'Assign'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
