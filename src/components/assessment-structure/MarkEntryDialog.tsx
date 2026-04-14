'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { StudentTermResult } from '@/types';

interface MarkEntry {
  studentId: string;
  mark: number;
  total: number;
  percentage: number;
  isAbsent: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  lineItemName: string;
  totalMarks: number;
  students: StudentTermResult[];
  lineItemId: string;
  onSaveMarks: (marks: MarkEntry[]) => Promise<void>;
  onSaveAndClose?: (marks: MarkEntry[]) => Promise<void>;
}

interface RowState {
  mark: string;
  isAbsent: boolean;
}

function buildInitialRows(
  students: StudentTermResult[],
  lineItemId: string,
): Record<string, RowState> {
  const rows: Record<string, RowState> = {};
  for (const student of students) {
    let mark = '';
    let isAbsent = false;
    for (const cat of student.categories) {
      const li = cat.lineItems.find((l) => l.lineItemId === lineItemId);
      if (li) {
        isAbsent = li.isAbsent;
        mark = li.mark !== null ? String(li.mark) : '';
        break;
      }
    }
    rows[student.studentId] = { mark, isAbsent };
  }
  return rows;
}

function buildMarkEntries(
  rows: Record<string, RowState>,
  total: number,
): MarkEntry[] {
  return Object.entries(rows).map(([studentId, row]) => {
    const mark = row.isAbsent ? 0 : (parseFloat(row.mark) || 0);
    const percentage = total > 0 && !row.isAbsent ? (mark / total) * 100 : 0;
    return { studentId, mark, total, percentage: Math.round(percentage * 10) / 10, isAbsent: row.isAbsent };
  });
}

export function MarkEntryDialog({
  open,
  onClose,
  lineItemName,
  totalMarks,
  students,
  lineItemId,
  onSaveMarks,
  onSaveAndClose,
}: Props) {
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRows(buildInitialRows(students, lineItemId));
      setError('');
    }
  }, [open, students, lineItemId]);

  const setMark = (studentId: string, value: string) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], mark: value } }));
  };

  const setAbsent = (studentId: string, checked: boolean) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], isAbsent: checked, mark: checked ? '' : prev[studentId].mark } }));
  };

  const validate = (): boolean => {
    for (const [, row] of Object.entries(rows)) {
      if (!row.isAbsent && row.mark !== '') {
        const num = parseFloat(row.mark);
        if (isNaN(num) || num < 0 || num > totalMarks) return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) { setError(`Marks must be between 0 and ${totalMarks}`); return; }
    setSaving(true);
    setError('');
    try {
      await onSaveMarks(buildMarkEntries(rows, totalMarks));
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    if (!onSaveAndClose) return;
    if (!validate()) { setError(`Marks must be between 0 and ${totalMarks}`); return; }
    setSaving(true);
    setError('');
    try {
      await onSaveAndClose(buildMarkEntries(rows, totalMarks));
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enter Marks — {lineItemName}</DialogTitle>
          <DialogDescription>Total marks: {totalMarks}. Valid range: 0 – {totalMarks}.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 items-center text-sm font-medium text-muted-foreground mb-2 px-1">
            <span>Student</span>
            <span className="w-20 text-center">Mark</span>
            <span className="w-16 text-center">Absent</span>
          </div>
          {students.map((student) => {
            const row = rows[student.studentId] ?? { mark: '', isAbsent: false };
            return (
              <div
                key={student.studentId}
                className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 items-center px-1 py-1 border-b last:border-0"
              >
                <span className="text-sm truncate">{student.studentName}</span>
                <Input
                  type="number"
                  min={0}
                  max={totalMarks}
                  step="0.5"
                  className="w-20 text-center"
                  value={row.mark}
                  disabled={row.isAbsent || saving}
                  onChange={(e) => setMark(student.studentId, e.target.value)}
                  placeholder="—"
                />
                <div className="w-16 flex justify-center">
                  <Checkbox
                    checked={row.isAbsent}
                    onCheckedChange={(v) => setAbsent(student.studentId, v === true)}
                    disabled={saving}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="text-xs text-destructive px-1 pb-1">{error}</p>}

        <DialogFooter className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {onSaveAndClose && (
            <Button type="button" variant="secondary" onClick={handleSaveAndClose} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Close Item'}
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
