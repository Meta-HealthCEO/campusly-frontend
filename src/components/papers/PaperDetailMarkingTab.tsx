'use client';

import { useState } from 'react';
import {
  Camera, ClipboardList, Inbox, CheckCircle2, Loader2, AlertTriangle,
  Keyboard, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MarkingUpload } from '@/components/ai-tools/MarkingUpload';
import { PaperBatchMarkingDialog } from '@/components/papers/PaperBatchMarkingDialog';
import { PaperMarkingTextDialog } from '@/components/papers/PaperMarkingTextDialog';
import { PaperMarkingReviewDialog } from '@/components/papers/PaperMarkingReviewDialog';
import { usePaperMarkingRoster } from '@/hooks/usePaperMarkingRoster';
import { useTeacherMarking } from '@/hooks/useTeacherMarking';
import type {
  Paper,
  RosterStudent,
  PaperMarkingStatus,
  SubmissionStatus,
  PaperAssignmentMode,
} from '@/types/papers';

interface Props { paper: Paper }

interface StudentTarget {
  classId: string;
  studentId: string;
  studentName: string;
}

interface BatchTarget {
  classId: string;
  className: string;
}

export function PaperDetailMarkingTab({ paper }: Props) {
  const { roster, loading, refetch } = usePaperMarkingRoster(paper._id);
  const { markPaper, loading: marking } = useTeacherMarking();
  const [uploadTarget, setUploadTarget] = useState<StudentTarget | null>(null);
  const [textTarget, setTextTarget] = useState<StudentTarget | null>(null);
  const [batchTarget, setBatchTarget] = useState<BatchTarget | null>(null);
  const [reviewMarkingId, setReviewMarkingId] = useState<string | null>(null);

  const handleUpload = async (images: { base64: string; type: string }[]) => {
    if (!uploadTarget) return;
    const files = images.map((img, idx) => {
      const payload = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const ext = img.type.split('/')[1] ?? 'png';
      return new File([bytes], `page-${idx + 1}.${ext}`, { type: img.type });
    });
    const result = await markPaper(
      paper._id,
      'assessment',
      uploadTarget.studentName,
      files,
      { studentId: uploadTarget.studentId, classId: uploadTarget.classId },
    );
    if (result) {
      setUploadTarget(null);
      await refetch();
    }
  };

  if (paper.status !== 'finalised') {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Finalise the paper to start marking"
        description="Only finalised papers can be assigned and marked. Finalise from the header above."
      />
    );
  }

  if (loading) return <LoadingSpinner />;

  if (!roster || roster.classes.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No classes assigned yet"
        description="Assign this paper to a class on the Assignments tab — student rosters will appear here for marking."
      />
    );
  }

  return (
    <div className="space-y-6">
      {roster.classes.map((cls) => (
        <Card key={cls.classId}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                {cls.className}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">
                  {modeLabel(cls.mode)}
                </Badge>
                <Badge variant="secondary">
                  {markedCount(cls.students)}/{cls.studentCount} marked
                </Badge>
                {cls.mode === 'paper' && cls.students.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchTarget({
                      classId: cls.classId,
                      className: cls.className,
                    })}
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    Batch upload
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {cls.students.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No students enrolled in this class yet.
              </p>
            ) : (
              <ul className="divide-y">
                {cls.students.map((s) => (
                  <RosterRow
                    key={s.studentId}
                    student={s}
                    mode={cls.mode}
                    onReview={(id) => setReviewMarkingId(id)}
                    onUpload={() => setUploadTarget({
                      classId: cls.classId,
                      studentId: s.studentId,
                      studentName: s.studentName,
                    })}
                    onType={() => setTextTarget({
                      classId: cls.classId,
                      studentId: s.studentId,
                      studentName: s.studentName,
                    })}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Single-student photo upload (existing flow) */}
      <Dialog
        open={uploadTarget !== null}
        onOpenChange={(open) => { if (!open) setUploadTarget(null); }}
      >
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              Upload pages for {uploadTarget?.studentName ?? ''}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Photograph the student&apos;s handwritten answers. AI grades against this paper&apos;s memo.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <MarkingUpload
              onSubmit={(images) => void handleUpload(images)}
              onBack={() => setUploadTarget(null)}
              isLoading={marking}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Per-student typed answers */}
      {textTarget && (
        <PaperMarkingTextDialog
          open={textTarget !== null}
          onOpenChange={(open) => { if (!open) setTextTarget(null); }}
          paperId={paper._id}
          classId={textTarget.classId}
          studentId={textTarget.studentId}
          studentName={textTarget.studentName}
          onMarked={() => { void refetch(); }}
        />
      )}

      {/* Per-class bulk OCR batch */}
      {batchTarget && (
        <PaperBatchMarkingDialog
          open={batchTarget !== null}
          onOpenChange={(open) => { if (!open) setBatchTarget(null); }}
          paperId={paper._id}
          classId={batchTarget.classId}
          className={batchTarget.className}
          onComplete={() => { void refetch(); }}
        />
      )}

      {/* Inline review of an existing marking */}
      <PaperMarkingReviewDialog
        open={reviewMarkingId !== null}
        onOpenChange={(open) => { if (!open) setReviewMarkingId(null); }}
        markingId={reviewMarkingId}
        onChanged={() => { void refetch(); }}
      />
    </div>
  );
}

interface RowProps {
  student: RosterStudent;
  mode: PaperAssignmentMode;
  onReview: (markingId: string) => void;
  onUpload: () => void;
  onType: () => void;
}

function RosterRow({ student, mode, onReview, onUpload, onType }: RowProps) {
  const m = student.marking;
  const s = student.submission;
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium truncate">{student.studentName}</p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {student.admissionNumber && <span>{student.admissionNumber}</span>}
          {s && <SubmissionPill status={s.status} />}
          {m && <MarkingPill status={m.status} percentage={m.percentage} />}
          {!s && !m && (
            <span className="text-muted-foreground">No work yet</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1 flex-wrap justify-end">
        {m ? (
          <Button variant="outline" size="sm" onClick={() => onReview(m.markingId)}>
            Review marking
          </Button>
        ) : (
          <>
            <Button
              variant={mode === 'paper' ? 'default' : 'outline'}
              size="sm"
              onClick={onUpload}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" /> Upload pages
            </Button>
            <Button variant="outline" size="sm" onClick={onType}>
              <Keyboard className="mr-1.5 h-3.5 w-3.5" /> Type answers
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function SubmissionPill({ status }: { status: Exclude<SubmissionStatus, 'not_started'> }) {
  const map: Record<typeof status, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    in_progress: { label: 'In progress', variant: 'outline' },
    submitted:   { label: 'Submitted online', variant: 'secondary' },
    graded:      { label: 'Graded', variant: 'default' },
    published:   { label: 'Published', variant: 'default' },
  };
  const info = map[status];
  return <Badge variant={info.variant} className="text-[10px] capitalize">{info.label}</Badge>;
}

function MarkingPill({ status, percentage }: { status: PaperMarkingStatus; percentage: number }) {
  if (status === 'processing') {
    return (
      <Badge variant="outline" className="text-[10px]">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Marking…
      </Badge>
    );
  }
  if (status === 'failed') {
    return <Badge variant="destructive" className="text-[10px]">Marking failed</Badge>;
  }
  if (status === 'needs_review') {
    return <Badge variant="outline" className="text-[10px]">Needs review</Badge>;
  }
  return (
    <Badge variant="default" className="text-[10px]">
      <CheckCircle2 className="mr-1 h-3 w-3" /> {percentage}%
    </Badge>
  );
}

function modeLabel(mode: PaperAssignmentMode): string {
  return mode === 'digital' ? 'Digital' : 'Printed';
}

function markedCount(students: RosterStudent[]): number {
  return students.filter((s) => !!s.marking).length;
}
