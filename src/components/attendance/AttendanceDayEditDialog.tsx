'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StudentRow } from '@/components/attendance/StudentRow';
import { Loader2, Save } from 'lucide-react';
import { useAttendanceDayEdit } from '@/hooks/useAttendanceDayEdit';
import type { Student } from '@/types';

interface AttendanceDayEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  date: string;
  period: number;
  students: Student[];
  onSaved: () => void;
}

export function AttendanceDayEditDialog({
  open, onOpenChange, classId, date, period, students, onSaved,
}: AttendanceDayEditDialogProps) {
  const { entries, loading, saving, updateStatus, updateNote, save } = useAttendanceDayEdit({
    open, classId, date, period, students,
  });

  const dialogTitle = useMemo(() => `Edit attendance — ${date}`, [date]);

  const handleSave = async () => {
    const ok = await save();
    if (ok) {
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s) => {
                const e = entries.get(s.id);
                return (
                  <StudentRow
                    key={s.id}
                    student={s}
                    status={e?.status ?? 'present'}
                    note={e?.note}
                    onUpdate={updateStatus}
                    onNoteChange={updateNote}
                  />
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => { void handleSave(); }} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
