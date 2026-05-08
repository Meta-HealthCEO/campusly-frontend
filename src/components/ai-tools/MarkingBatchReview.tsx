'use client';

import { useState, useMemo } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useTeacherMarkingBatch } from '@/hooks/useTeacherMarkingBatch';
import { useTeacherStudents } from '@/hooks/useTeacherStudents';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MarkingBatch, ConfirmBatchAssignment } from '@/types/marking';
import type { Student } from '@/types';

interface Props {
  batch: MarkingBatch;
  onConfirmed: () => void;
}

function fullName(s: Student): string {
  return (
    `${s.firstName ?? s.user?.firstName ?? ''} ${s.lastName ?? s.user?.lastName ?? ''}`.trim() ||
    'Unknown'
  );
}

export function MarkingBatchReview({ batch, onConfirmed }: Props) {
  const { confirmBatch } = useTeacherMarkingBatch();
  const { students: allStudents, loading: studentsLoading } = useTeacherStudents();

  const students = useMemo(
    () => allStudents.filter((s) => s.classId === batch.classId),
    [allStudents, batch.classId],
  );

  // ambiguous index -> selected studentId
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async (): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const assignments: ConfirmBatchAssignment[] = [];

      // Auto-matched groups: build map from matchedStudentId -> filenames[]
      const autoMap: Record<string, string[]> = {};
      for (const extract of batch.pageExtracts) {
        if (extract.matchedStudentId) {
          const existing = autoMap[extract.matchedStudentId] ?? [];
          existing.push(extract.filename);
          autoMap[extract.matchedStudentId] = existing;
        }
      }

      for (const [studentId, filenames] of Object.entries(autoMap)) {
        const student = students.find((s) => s.id === studentId);
        assignments.push({
          imageFilenames: filenames,
          studentId,
          studentName: student ? fullName(student) : studentId,
        });
      }

      // Ambiguous groups: only included if teacher selected an override
      batch.ambiguousMatches.forEach((match, idx) => {
        const selectedId = overrides[idx];
        if (!selectedId) return;
        const student = students.find((s) => s.id === selectedId);
        assignments.push({
          imageFilenames: match.imageFilenames,
          studentId: selectedId,
          studentName: student ? fullName(student) : selectedId,
        });
      });

      if (assignments.length === 0) return;
      const result = await confirmBatch(batch._id, assignments);
      if (result) onConfirmed();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmedCount = batch.matchedCount + Object.keys(overrides).length;

  if (studentsLoading && batch.ambiguousMatches.length > 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      {/* Badge bar */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">{batch.matchedCount} auto-matched</Badge>
        <Badge variant="secondary">{batch.unmatchedCount} need review</Badge>
      </div>

      {/* Ambiguous match cards */}
      {batch.ambiguousMatches.length > 0 && (
        <div className="space-y-3">
          {batch.ambiguousMatches.map((match, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {match.imageFilenames.length} page(s) — extracted:{' '}
                  <strong>{match.extractedName ?? '(none)'}</strong>
                  {match.extractedAdmissionNumber
                    ? ` — ${match.extractedAdmissionNumber}`
                    : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={overrides[idx] ?? ''}
                  onValueChange={(v: unknown) => {
                    if (typeof v !== 'string') return;
                    setOverrides((prev) => ({
                      ...prev,
                      [idx]: v === 'none' ? '' : v,
                    }));
                  }}
                >
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Assign to student..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— skip this group —</SelectItem>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {fullName(s)} ({s.admissionNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button
        onClick={() => void handleConfirm()}
        disabled={submitting || confirmedCount === 0}
        className="w-full sm:w-auto"
      >
        {submitting ? 'Confirming...' : `Confirm & Mark ${confirmedCount} student${confirmedCount === 1 ? '' : 's'}`}
      </Button>
    </div>
  );
}
