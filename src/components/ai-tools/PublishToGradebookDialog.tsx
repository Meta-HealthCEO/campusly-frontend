'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
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
import { unwrapList } from '@/lib/api-helpers';

interface AssessmentOption {
  id: string;
  name: string;
  totalMarks: number;
  term: number;
  subjectName?: string;
}

export interface PublishToGradebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: (assessmentId: string, comment?: string) => Promise<void>;
  submitting?: boolean;
}

export function PublishToGradebookDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  submitting = false,
}: PublishToGradebookDialogProps) {
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [assessmentId, setAssessmentId] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setAssessmentId('');
    setComment('');

    apiClient
      .get('/academic/assessments')
      .then((res) => {
        if (cancelled) return;
        const rows = unwrapList<Record<string, unknown>>(res).map((r) => ({
          id: ((r.id ?? r._id) as string) ?? '',
          name: (r.name as string) ?? '',
          totalMarks: (r.totalMarks as number) ?? 0,
          term: (r.term as number) ?? 0,
          subjectName: (r.subjectId as { name?: string } | undefined)?.name,
        }));
        setAssessments(rows);
      })
      .catch(() => {
        if (!cancelled) setAssessments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!assessmentId) return;
    await onConfirm(assessmentId, comment || undefined);
    onOpenChange(false);
    setAssessmentId('');
    setComment('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assessment">
              Assessment <span className="text-destructive">*</span>
            </Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments…
              </div>
            ) : assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assessments found. Create one in Curriculum → Assessments first.
              </p>
            ) : (
              <Select onValueChange={(v: string | null) => { if (v) setAssessmentId(v); }}>
                <SelectTrigger id="assessment">
                  <SelectValue placeholder="Pick an assessment" />
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
            )}
          </div>

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
            disabled={!assessmentId || submitting || loading}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
