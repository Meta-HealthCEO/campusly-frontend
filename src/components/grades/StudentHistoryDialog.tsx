'use client';

import { useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { MarkEntry, StudentMark } from '@/hooks/useTeacherGrades';

interface StudentHistoryDialogProps {
  student: MarkEntry | null;
  history: StudentMark[];
  onClose: () => void;
  onFetchHistory: (studentId: string) => Promise<void>;
}

export function StudentHistoryDialog({
  student,
  history,
  onClose,
  onFetchHistory,
}: StudentHistoryDialogProps) {
  const open = student !== null;

  useEffect(() => {
    if (student) {
      onFetchHistory(student.studentId).catch(() => undefined);
    }
  }, [student, onFetchHistory]);

  const average =
    history.length > 0
      ? Math.round(
          history.reduce((sum, m) => sum + m.percentage, 0) / history.length,
        )
      : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {student ? `${student.lastName}, ${student.firstName}` : 'Student History'}
          </DialogTitle>
          <DialogDescription>
            {student?.admissionNumber
              ? `Admission No: ${student.admissionNumber}`
              : 'Assessment history across all subjects'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {!student ? (
            <LoadingSpinner />
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No assessment history found for this student.
            </p>
          ) : (
            <>
              {average !== null && (
                <div className="mb-4 rounded-lg bg-muted px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Overall average: </span>
                  <span className="font-semibold">{average}%</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium text-muted-foreground">Assessment</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Subject</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Mark</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Total</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-2 truncate max-w-[180px]">{m.assessmentName || '—'}</td>
                        <td className="py-2 text-muted-foreground truncate max-w-[120px]">
                          {m.subjectName || '—'}
                        </td>
                        <td className="py-2">{m.mark}</td>
                        <td className="py-2">{m.total}</td>
                        <td className="py-2">
                          <span
                            className={
                              m.percentage >= 80
                                ? 'font-semibold text-primary'
                                : m.percentage >= 50
                                ? 'font-semibold text-blue-600'
                                : 'font-semibold text-destructive'
                            }
                          >
                            {m.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
