'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useTeacherAssessments } from '@/hooks/useTeacherAssessments';

export interface IssueResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** When `assessmentId` is empty, the backend auto-creates one from the paper. */
  onConfirm: (assessmentId: string, comment?: string) => Promise<void>;
  submitting?: boolean;
  classId?: string;
  subjectId?: string;
  /** Set true when the source supports backend auto-creating the Assessment
   *  (paperType === 'assessment'). Hides the "no assessments" blocker. */
  allowAutoCreate?: boolean;
}

export function IssueResultDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  submitting = false,
  classId,
  subjectId,
  allowAutoCreate = false,
}: IssueResultDialogProps) {
  const { assessments, loading } = useTeacherAssessments({
    classId,
    subjectId,
    enabled: open,
  });
  const [assessmentId, setAssessmentId] = useState('');
  const [comment, setComment] = useState('');

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAssessmentId('');
      setComment('');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    // Empty assessmentId is allowed when the backend can auto-create one from
    // the paper (assessment-bank papers). The backend will lazily find or
    // create a matching Assessment in that case.
    if (!assessmentId && !allowAutoCreate) return;
    await onConfirm(assessmentId, comment || undefined);
    onOpenChange(false);
    setAssessmentId('');
    setComment('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Assessment picker — only shown in two cases:
              1. allowAutoCreate=false (generated papers) where it's required.
              2. allowAutoCreate=true AND existing gradebook entries are
                 already linked to this paper — gives the teacher a chance
                 to attach to a specific one. In the common case (no existing
                 entry) we hide the picker entirely; the backend creates one
                 from the paper automatically. Teachers shouldn't have to
                 reason about gradebook-entries vs papers. */}
          {!allowAutoCreate || (assessments.length > 0 && !loading) ? (
            <div className="space-y-2">
              <Label htmlFor="assessment">
                Gradebook entry{allowAutoCreate ? ' (optional)' : <> <span className="text-destructive">*</span></>}
              </Label>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : assessments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No gradebook entries found. Create and finalise a paper first.
                </p>
              ) : (
                <>
                  <Select onValueChange={(v: string | null) => setAssessmentId(v ?? '')}>
                    <SelectTrigger id="assessment">
                      <SelectValue placeholder={allowAutoCreate ? 'Create new from this paper' : 'Pick a gradebook entry'} />
                    </SelectTrigger>
                    <SelectContent>
                      {assessments.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} — Term {a.term} · {a.totalMarks} marks
                          {a.subjectName ? ` · ${a.subjectName}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {allowAutoCreate && (
                    <p className="text-xs text-muted-foreground">
                      Leave blank to create a new gradebook entry from this paper.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Marks will be saved to the gradebook under this paper.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || (!assessmentId && !allowAutoCreate)}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Issue Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
