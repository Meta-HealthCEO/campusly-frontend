'use client';

import { useEffect, useState, useMemo } from 'react';
import { Send, Save, FileText, ExternalLink } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import type {
  Assignment,
  AssignmentSubmission,
  PopulatedStudent,
  SubmissionRubricMark,
} from '@/types/assignments';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string | null;
  assignment: Assignment;
  onMarked: () => void;
}

interface DraftMark {
  criterionId: string;
  awarded: number;
  feedback: string;
}

function studentName(student: AssignmentSubmission['studentId']): string {
  if (typeof student !== 'object' || student === null) return 'Student';
  const s = student as PopulatedStudent;
  if (s.userId?.firstName || s.userId?.lastName) {
    return `${s.userId.firstName ?? ''} ${s.userId.lastName ?? ''}`.trim();
  }
  return s.admissionNumber ?? 'Student';
}

function emptyDraft(criteria: Assignment['rubric']): DraftMark[] {
  return criteria.map((c) => ({ criterionId: c._id, awarded: 0, feedback: '' }));
}

function mergeDraft(
  criteria: Assignment['rubric'],
  marks: SubmissionRubricMark[],
): DraftMark[] {
  return criteria.map((c) => {
    const existing = marks.find((m) => m.criterionId === c._id);
    return {
      criterionId: c._id,
      awarded: existing?.awarded ?? 0,
      feedback: existing?.feedback ?? '',
    };
  });
}

export function AssignmentMarkingDialog({
  open, onOpenChange, submissionId, assignment, onMarked,
}: Props) {
  const { getSubmission, markSubmission } = useTeacherAssignments();
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [draft, setDraft] = useState<DraftMark[]>(() => emptyDraft(assignment.rubric));
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !submissionId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setSubmission(null);
      const s = await getSubmission(submissionId);
      if (cancelled) return;
      setSubmission(s);
      if (s) {
        setDraft(mergeDraft(assignment.rubric, s.rubricMarks));
        setFeedback(s.teacherFeedback ?? '');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, submissionId, getSubmission, assignment.rubric]);

  const totalAwarded = useMemo(() => draft.reduce((s, m) => s + (m.awarded || 0), 0), [draft]);
  const totalAvailable = assignment.totalMarks;
  const percentage = totalAvailable > 0
    ? Math.round((totalAwarded / totalAvailable) * 100)
    : 0;

  const validCriterionMarks = draft.length === assignment.rubric.length && draft.every((m, idx) => {
    const criterion = assignment.rubric[idx];
    if (!criterion) return false;
    return m.awarded >= 0 && m.awarded <= criterion.maxMarks;
  });

  const handleAdjust = (idx: number, patch: Partial<DraftMark>) => {
    setDraft((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const submit = async (publish: boolean) => {
    if (!submissionId || !validCriterionMarks) return;
    setSaving(true);
    const updated = await markSubmission(submissionId, {
      rubricMarks: draft.map((m) => ({
        criterionId: m.criterionId,
        awarded: m.awarded,
        feedback: m.feedback || undefined,
      })),
      teacherFeedback: feedback || undefined,
      publish,
    });
    setSaving(false);
    if (updated) {
      onMarked();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {submission ? `Mark — ${studentName(submission.studentId)}` : 'Mark submission'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!submission ? (
            <div className="py-12 flex justify-center">
              {loading ? <LoadingSpinner /> : <p className="text-sm text-muted-foreground">Submission not found.</p>}
            </div>
          ) : (
            <>
              {/* Submission content */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">Submitted work</p>
                    {submission.isLate && (
                      <Badge variant="destructive" className="text-[10px]">Late submission</Badge>
                    )}
                  </div>
                  {submission.files.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Files</p>
                      <ul className="space-y-1.5">
                        {submission.files.map((f) => (
                          <li key={f.url}>
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {f.filename}
                              <span className="text-xs text-muted-foreground">
                                ({Math.ceil(f.sizeBytes / 1024)} KB)
                              </span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {submission.textAnswer && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Typed response</p>
                      <div className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap text-sm max-h-60 overflow-y-auto">
                        {submission.textAnswer}
                      </div>
                    </div>
                  )}
                  {submission.files.length === 0 && !submission.textAnswer && (
                    <p className="text-sm text-muted-foreground">No content submitted.</p>
                  )}
                </CardContent>
              </Card>

              {/* Rubric scoring */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium">Rubric scoring</p>
                  <Badge
                    variant={percentage >= 50 ? 'default' : 'destructive'}
                    className="text-sm"
                  >
                    {totalAwarded} / {totalAvailable} ({percentage}%)
                  </Badge>
                </div>

                {assignment.rubric.map((c, idx) => {
                  const m = draft[idx];
                  if (!m) return null;
                  return (
                    <Card key={c._id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{c.name}</p>
                            {c.description && (
                              <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={c.maxMarks}
                              value={m.awarded}
                              onChange={(e) =>
                                handleAdjust(idx, { awarded: Math.min(c.maxMarks, Math.max(0, Number(e.target.value) || 0)) })
                              }
                              className="w-16 h-8 text-center"
                            />
                            <span className="text-xs text-muted-foreground">
                              / {c.maxMarks}
                            </span>
                          </div>
                        </div>
                        <Textarea
                          value={m.feedback}
                          onChange={(e) => handleAdjust(idx, { feedback: e.target.value })}
                          placeholder="Feedback for this criterion (optional)"
                          rows={2}
                          className="text-sm"
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Overall feedback */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium">Overall feedback</p>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="A note to the student about the whole piece (optional)"
                    rows={3}
                    className="text-sm"
                  />
                </CardContent>
              </Card>

              {submission.lateMarkAdjustment && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium">Late penalty applied</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Raw: {submission.lateMarkAdjustment.rawMark} · Penalty: {submission.lateMarkAdjustment.penaltyPercent}% · Final: {submission.lateMarkAdjustment.finalMark}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => void submit(false)}
            disabled={!submission || saving || !validCriterionMarks}
          >
            <Save className="mr-2 h-4 w-4" /> Save (don&apos;t publish)
          </Button>
          <Button
            onClick={() => void submit(true)}
            disabled={!submission || saving || !validCriterionMarks}
          >
            <Send className="mr-2 h-4 w-4" />
            {saving ? 'Publishing…' : 'Save & publish to gradebook'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
