'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StudentRow } from '@/components/attendance/StudentRow';
import { Loader2, Save } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage, resolveId } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { Student } from '@/types';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';

interface RawRecord {
  studentId: string | { id?: string; _id?: string };
  status: AttendanceStatus;
  notes?: string;
  period?: number;
}

interface AttendanceDayEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  date: string;        // YYYY-MM-DD
  period: number;
  students: Student[];
  onSaved: () => void; // parent refreshes the grid
}

interface Entry {
  status: AttendanceStatus;
  note?: string;
}

export function AttendanceDayEditDialog({
  open, onOpenChange, classId, date, period, students, onSaved,
}: AttendanceDayEditDialogProps) {
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiClient.get(`/attendance/class/${classId}`, { params: { date } });
        if (cancelled) return;
        const raw = unwrapList<RawRecord>(res).filter((r) => (r.period ?? 1) === period);
        const map = new Map<string, Entry>();
        students.forEach((s) => map.set(s.id, { status: 'present' }));
        for (const r of raw) {
          const sid = resolveId(r.studentId);
          if (sid) map.set(sid, { status: r.status, note: r.notes });
        }
        setEntries(map);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Could not load this day'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, classId, date, period, students]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, { status, note: existing?.note });
      return next;
    });
  };

  const updateNote = (studentId: string, note: string) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, {
        status: existing?.status ?? 'present',
        note: note.trim() === '' ? undefined : note,
      });
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.post('/attendance/bulk', {
        classId,
        date,                  // plain YYYY-MM-DD
        period,
        records: students.map((s) => {
          const e = entries.get(s.id);
          return {
            studentId: s.id,
            status: e?.status ?? 'present',
            notes: e?.note?.trim() ?? '',
          };
        }),
      });
      toast.success(`Attendance saved for ${date}`);
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const dialogTitle = useMemo(() => `Edit attendance — ${date}`, [date]);

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
          <Button onClick={() => { void save(); }} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
