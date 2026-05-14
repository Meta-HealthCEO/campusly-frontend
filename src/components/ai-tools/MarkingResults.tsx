'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw, Send, ListOrdered, Save, AlertTriangle } from 'lucide-react';
import type { PaperMarking, MarkingQuestion } from '@/hooks/useTeacherMarking';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { IssueResultDialog } from './IssueResultDialog';

const IMAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4500/api').replace(/\/api\/?$/, '') + '/uploads';

interface MarkingResultsProps {
  marking: PaperMarking;
  onUpdateMarks: (questions: MarkingQuestion[]) => Promise<void>;
  onPublish: (assessmentId: string, comment?: string) => Promise<void>;
  onMarkNext: () => void;
  onViewAll: () => void;
  isLoading: boolean;
  /** Hide "Mark next student" / "View all results" buttons — useful in
   *  contexts that already return to a roster (per-paper workspace). */
  hideSecondaryActions?: boolean;
}

function scoreBadgeVariant(awarded: number, max: number) {
  if (awarded === max) return 'default' as const;
  if (awarded > 0) return 'secondary' as const;
  return 'destructive' as const;
}

export function MarkingResults({
  marking,
  onUpdateMarks,
  onPublish,
  onMarkNext,
  onViewAll,
  isLoading,
  hideSecondaryActions = false,
}: MarkingResultsProps) {
  const [questions, setQuestions] = useState<MarkingQuestion[]>(marking.questions);
  const [dirty, setDirty] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Re-sync local question state when the marking changes (e.g. opening a
  // different marking from the History tab). Without this, the local state
  // stays pinned to the first marking ever rendered by this component.
  useEffect(() => {
    setQuestions(marking.questions);
    setDirty(false);
  }, [marking.id, marking.questions]);

  const { getPaperById } = useTeacherPapers();
  const [paperVersion, setPaperVersion] = useState<number | null>(null);
  const [paperSubjectId, setPaperSubjectId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (marking.paperType !== 'assessment') return;
    let cancelled = false;
    void getPaperById(marking.paperId).then((p) => {
      if (cancelled) return;
      setPaperVersion(p?.version ?? null);
      // subjectId may come back as a populated { _id, name } or a plain string.
      const rawSubject = (p as { subjectId?: unknown } | null)?.subjectId;
      if (typeof rawSubject === 'string') {
        setPaperSubjectId(rawSubject);
      } else if (rawSubject && typeof rawSubject === 'object') {
        const s = rawSubject as { id?: string; _id?: string };
        setPaperSubjectId(s.id ?? s._id);
      }
    });
    return () => { cancelled = true; };
  }, [marking.paperId, marking.paperType, getPaperById]);

  const markingVersion = marking.paperVersion ?? null;
  const isStale =
    paperVersion !== null &&
    markingVersion !== null &&
    markingVersion < paperVersion;

  const adjustedTotal = useMemo(
    () => questions.reduce((sum, q) => sum + q.marksAwarded, 0),
    [questions],
  );

  const adjustedPct = useMemo(
    () => (marking.maxMarks > 0 ? Math.round((adjustedTotal / marking.maxMarks) * 1000) / 10 : 0),
    [adjustedTotal, marking.maxMarks],
  );

  const handleAdjust = useCallback((index: number, marks: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = updated[index];
      updated[index] = { ...q, marksAwarded: Math.min(Math.max(0, marks), q.maxMarks) };
      return updated;
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    await onUpdateMarks(questions);
    setDirty(false);
  }, [onUpdateMarks, questions]);

  const pctVariant = adjustedPct >= 50 ? 'default' : 'destructive';
  const statusVariant = marking.status === 'published' ? 'default' : 'secondary';
  const downrankAccept = marking.paperMismatch && marking.status === 'needs_review';

  return (
    <div className="space-y-4">
      {/* Stale-marking banner */}
      {isStale && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm font-medium">Paper edited since this marking</p>
          <p className="text-xs text-muted-foreground">
            Re-mark recommended. Marking captured paper v{markingVersion}, current is v{paperVersion}.
          </p>
        </div>
      )}

      {/* Paper mismatch warning */}
      {marking.paperMismatch && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/5 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-destructive">This doesn&apos;t look like the selected paper.</p>
            <p className="text-muted-foreground">
              The AI read the header as:{' '}
              <span className="font-medium">&ldquo;{marking.extractedHeader ?? 'unknown'}&rdquo;</span>
            </p>
            {marking.mismatchReason && (
              <p className="text-muted-foreground">{marking.mismatchReason}</p>
            )}
            <p className="text-muted-foreground mt-2">
              Please review carefully before accepting these marks, or cancel and re-upload with the correct paper.
            </p>
          </div>
        </div>
      )}

      {/* Image strip */}
      {marking.images && marking.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-2">
          {marking.images.map((img) => {
            const url = `${IMAGE_BASE}/markings/${marking.id}/${img.filename}`;
            return (
              <a
                key={img.filename}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 border rounded overflow-hidden hover:border-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Page ${img.pageNumber}`} className="h-32 w-auto object-cover" />
              </a>
            );
          })}
        </div>
      )}

      {/* Summary card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">{marking.studentName}</CardTitle>
              <Badge variant={statusVariant} className="capitalize shrink-0">
                {marking.status}
              </Badge>
            </div>
            <Badge variant={pctVariant} className="text-sm shrink-0">
              {adjustedTotal} / {marking.maxMarks} ({adjustedPct}%)
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Q{q.questionNumber}</span>
                    <Badge variant={scoreBadgeVariant(q.marksAwarded, q.maxMarks)}>
                      {q.marksAwarded}/{q.maxMarks}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Student: </span>
                      <span className="line-clamp-2">{q.studentAnswer}</span>
                    </p>
                    <p>
                      <span className="font-medium">Correct: </span>
                      <span className="text-muted-foreground line-clamp-2">{q.correctAnswer}</span>
                    </p>
                    <p className="text-muted-foreground text-xs">{q.feedback}</p>
                    {q.rationale && (
                      <details className="text-xs text-muted-foreground mt-1">
                        <summary className="cursor-pointer hover:text-foreground">AI rationale</summary>
                        <p className="whitespace-pre-wrap mt-1 pl-2 border-l-2 border-muted">{q.rationale}</p>
                      </details>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:flex-col sm:items-end shrink-0">
                  <span className="text-xs text-muted-foreground">Marks:</span>
                  <Input
                    type="number"
                    min={0}
                    max={q.maxMarks}
                    value={q.marksAwarded}
                    onChange={(e) => handleAdjust(idx, Number(e.target.value))}
                    className="w-16 h-8 text-center text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {dirty && (
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save adjustments
          </Button>
        )}
        <Button
          variant={marking.status === 'published' || downrankAccept ? 'outline' : 'default'}
          onClick={() => setPublishOpen(true)}
          disabled={isLoading || marking.status === 'published' || publishing}
        >
          <Send className="mr-2 h-4 w-4" />
          Publish to gradebook
        </Button>
        {!hideSecondaryActions && (
          <>
            <Button variant="outline" onClick={onMarkNext}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Mark next student
            </Button>
            <Button variant="outline" onClick={onViewAll}>
              <ListOrdered className="mr-2 h-4 w-4" />
              View all results
            </Button>
          </>
        )}
      </div>

      <IssueResultDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Issue result to student"
        description="This will publish the mark to the gradebook and share the marking review with the student."
        submitting={publishing}
        classId={marking.classId ?? undefined}
        subjectId={paperSubjectId}
        // Assessment-bank papers support backend auto-create — generated
        // papers do not, so the picker stays mandatory for those.
        allowAutoCreate={marking.paperType === 'assessment'}
        onConfirm={async (assessmentId, comment) => {
          setPublishing(true);
          await onPublish(assessmentId, comment);
          setPublishing(false);
        }}
      />
    </div>
  );
}
