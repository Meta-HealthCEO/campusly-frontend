'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { getStudentDisplayName } from '@/lib/student-helpers';
import { resolveField } from '@/lib/api-helpers';
import type { Student } from '@/types';

interface AssignStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  currentStudentIds: string[];
  allStudents: Student[];
  onAssign: (studentId: string, classId: string) => Promise<void>;
}

export function AssignStudentDialog({
  open,
  onOpenChange,
  classId,
  currentStudentIds,
  allStudents,
  onAssign,
}: AssignStudentDialogProps) {
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const available = useMemo(() => {
    const currentSet = new Set(currentStudentIds);
    const q = search.trim().toLowerCase();
    return allStudents.filter((s: Student) => {
      if (currentSet.has(s.id)) return false;
      if (!q) return true;
      const { full } = getStudentDisplayName(s);
      return (
        full.toLowerCase().includes(q) ||
        (s.admissionNumber ?? '').toLowerCase().includes(q)
      );
    });
  }, [allStudents, currentStudentIds, search]);

  const handleAssign = async (student: Student) => {
    setAssigningId(student.id);
    try {
      await onAssign(student.id, classId);
    } finally {
      setAssigningId(null);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) setSearch('');
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Existing Student</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or admission number..."
              className="pl-9"
            />
          </div>

          {allStudents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No students found. Add students to your classes first.
            </p>
          ) : available.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {search ? 'No students match your search.' : 'All students are already assigned to this class.'}
            </p>
          ) : (
            <div className="space-y-2">
              {available.map((student: Student) => {
                const { first, last } = getStudentDisplayName(student);
                const currentClassName =
                  resolveField<string>(student.class, 'name') ?? '';
                const currentGradeName =
                  resolveField<string>(student.grade, 'name') ?? '';
                return (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{first} {last}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.admissionNumber}
                        {currentClassName ? ` · ${currentGradeName} ${currentClassName}`.trim() : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={assigningId === student.id}
                      onClick={() => handleAssign(student)}
                    >
                      {assigningId === student.id ? 'Assigning...' : 'Assign'}
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
