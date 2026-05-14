'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RotateCcw, Send, ListOrdered, Save, AlertTriangle, Download, Images } from 'lucide-react';
import type { PaperMarking, MarkingQuestion } from '@/hooks/useTeacherMarking';
import { useTeacherMarking } from '@/hooks/useTeacherMarking';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { IssueResultDialog } from './IssueResultDialog';
import { MarkingPagesLightbox } from './MarkingPagesLightbox';
import { MarkingQuestionCard } from './MarkingQuestionCard';
import apiClient from '@/lib/api-client';

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStart, setLightboxStart] = useState(0);
  const { downloadMarkingPdf } = useTeacherMarking();

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
        <div className="flex items-center gap-2 flex-wrap">
          {marking.images.slice(0, 3).map((img, i) => {
            const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
            const url = `${base}/ai-tools/markings/${marking.id}/image/${encodeURIComponent(img.filename)}`;
            return (
              <button
                key={img.filename}
                type="button"
                onClick={() => { setLightboxStart(i); setLightboxOpen(true); }}
                className="relative w-20 h-24 border rounded overflow-hidden hover:ring-2 hover:ring-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Page ${img.pageNumber}`} className="w-full h-full object-cover" />
              </button>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setLightboxStart(0); setLightboxOpen(true); }}
            className="gap-2"
          >
            <Images className="h-4 w-4" />
            View all {marking.images.length} pages
          </Button>
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
        {questions.map((q, i) => (
          <MarkingQuestionCard
            key={i}
            question={q}
            index={i}
            editable
            rationaleLabel="AI Rationale"
            onChange={(marksAwarded) => {
              const next = [...questions];
              next[i] = { ...next[i], marksAwarded };
              setQuestions(next);
              setDirty(true);
            }}
          />
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
        {marking.images && marking.images.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadMarkingPdf(marking.id, marking.studentName, '')}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        )}
        <Button
          type="button"
          onClick={() => setPublishOpen(true)}
          disabled={dirty || isLoading || publishing}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {marking.issuedToStudent ? 'Re-issue' : 'Issue Result'}
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

      {marking.issuedToStudent && marking.issuedAt && (
        <p className="text-xs text-muted-foreground">
          Issued {new Date(marking.issuedAt).toLocaleDateString()}
        </p>
      )}

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

      <MarkingPagesLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        markingId={marking.id}
        images={marking.images ?? []}
        startIndex={lightboxStart}
      />
    </div>
  );
}
