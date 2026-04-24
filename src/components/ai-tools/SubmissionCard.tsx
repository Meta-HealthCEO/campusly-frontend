'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Check, Send, RotateCcw } from 'lucide-react';
import { GradingJobStatusBadge } from './GradingJobStatusBadge';
import { PublishToGradebookDialog } from './PublishToGradebookDialog';
import { CriteriaEditor } from './CriteriaEditor';
import type { CriteriaEdit } from './CriteriaEditor';
import type { GradingJob } from './types';
import type { ReviewGradePayload } from '@/hooks/useAITools';

interface SubmissionCardProps {
  job: GradingJob;
  onReview: (jobId: string, payload: ReviewGradePayload) => void;
  onPublish: (jobId: string, assessmentId: string, comment?: string) => Promise<void>;
  onRetry: (jobId: string) => void;
}

function getStudentName(job: GradingJob): string {
  if (typeof job.studentId === 'object' && job.studentId !== null) {
    return `${job.studentId.firstName} ${job.studentId.lastName}`;
  }
  return String(job.studentId);
}

function initCriteriaEdits(job: GradingJob): CriteriaEdit[] {
  const overrideCriteria = job.teacherOverride?.criteriaScores;
  const aiCriteria = job.aiResult?.criteriaScores;
  const source = overrideCriteria ?? aiCriteria ?? [];
  return source.map((c) => ({
    criterion: c.criterion,
    score: c.score,
    maxScore: c.maxScore,
    feedback: c.feedback,
  }));
}

export function SubmissionCard({ job, onReview, onPublish, onRetry }: SubmissionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [criteriaEdits, setCriteriaEdits] = useState<CriteriaEdit[]>(() => initCriteriaEdits(job));
  const [teacherNotes, setTeacherNotes] = useState(job.teacherOverride?.teacherNotes ?? '');
  const [useCriteriaMode, setUseCriteriaMode] = useState(
    (job.aiResult?.criteriaScores?.length ?? 0) > 0,
  );
  const [overrideMark, setOverrideMark] = useState(
    job.teacherOverride?.finalMark ?? job.aiResult?.totalMark ?? 0,
  );
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const result = job.aiResult;
  const editedTotal = criteriaEdits.reduce((s, c) => s + c.score, 0);
  const maxTotal = criteriaEdits.reduce((s, c) => s + c.maxScore, 0);
  const displayMark = useCriteriaMode ? editedTotal : overrideMark;
  const displayMax = useCriteriaMode ? maxTotal : (result?.maxMark ?? 0);
  const percentage = displayMax > 0 ? Math.round((displayMark / displayMax) * 100) : 0;

  const handleApprove = () => {
    if (useCriteriaMode && criteriaEdits.length > 0) {
      onReview(job.id, { teacherNotes, criteriaScores: criteriaEdits });
    } else {
      onReview(job.id, { finalMark: overrideMark, teacherNotes });
    }
  };

  return (
    <Card>
      <button className="w-full text-left" onClick={() => setExpanded(!expanded)}>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{getStudentName(job)}</p>
              <GradingJobStatusBadge status={job.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Submitted {new Date(job.createdAt).toLocaleDateString()}
            </p>
          </div>
          {result && (
            <div className="text-right hidden sm:block">
              <p className="font-bold">{displayMark}/{displayMax}</p>
              <p className={`text-xs font-medium ${
                percentage >= 70 ? 'text-emerald-600' :
                percentage >= 50 ? 'text-orange-500' : 'text-destructive'
              }`}>{percentage}%</p>
            </div>
          )}
          {expanded ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </CardContent>
      </button>

      {expanded && (
        <div className="border-t px-5 pb-5 pt-4 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Student Submission
            </Label>
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              {job.submissionText}
            </div>
          </div>

          {result && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Marks per Criterion
                  </Label>
                  {(job.status === 'completed' || job.status === 'reviewed') && criteriaEdits.length > 0 && (
                    <button
                      className="text-xs text-primary underline"
                      onClick={() => setUseCriteriaMode((v) => !v)}
                    >
                      {useCriteriaMode ? 'Switch to total mark' : 'Override per criterion'}
                    </button>
                  )}
                </div>
                {(job.status === 'completed' || job.status === 'reviewed') && useCriteriaMode && criteriaEdits.length > 0 ? (
                  <CriteriaEditor
                    criteria={criteriaEdits}
                    aiScores={result.criteriaScores}
                    onChange={setCriteriaEdits}
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.criteriaScores.map((cs) => (
                      <div key={cs.criterion} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{cs.criterion}</p>
                          <p className="text-xs text-muted-foreground">
                            Max: {cs.maxScore} | AI: {cs.score}
                          </p>
                          {cs.feedback && (
                            <p className="mt-1 text-xs text-muted-foreground">{cs.feedback}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Overall Feedback
                </Label>
                <p className="text-sm rounded-lg bg-muted/50 p-3">{result.overallFeedback}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {result.strengths.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Strengths
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {result.strengths.map(s => (
                        <Badge key={s} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {result.improvements.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Areas for Improvement
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {result.improvements.map(imp => (
                        <Badge key={imp} variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                          {imp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {(job.status === 'completed' || job.status === 'reviewed') && (
                <div className="space-y-3 border-t pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {!useCriteriaMode && (
                      <div className="space-y-1">
                        <Label className="text-xs">Final Mark</Label>
                        <Input
                          type="number"
                          min={0}
                          max={result.maxMark}
                          value={overrideMark}
                          onChange={(e) => setOverrideMark(Number(e.target.value))}
                        />
                      </div>
                    )}
                    {useCriteriaMode && criteriaEdits.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Calculated Total</Label>
                        <p className="h-9 flex items-center text-sm font-semibold">
                          {editedTotal} / {maxTotal}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Teacher Notes</Label>
                      <Textarea
                        placeholder="Optional notes..."
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {job.status === 'completed' && (
                      <Button size="sm" onClick={handleApprove}>
                        <Check className="mr-2 h-4 w-4" /> Approve
                      </Button>
                    )}
                    {(job.status === 'completed' || job.status === 'reviewed') && (
                      <Button size="sm" variant="outline" onClick={() => setPublishOpen(true)}>
                        <Send className="mr-2 h-4 w-4" /> Publish
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {(job.status === 'queued' || job.status === 'grading') && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {job.status === 'queued'
                ? 'This submission is queued for AI grading...'
                : 'AI is currently grading this submission...'}
            </div>
          )}

          {job.status === 'failed' && (
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">Grading failed. You can retry this submission.</p>
              <Button size="sm" variant="outline" onClick={() => onRetry(job.id)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          )}
        </div>
      )}

      <PublishToGradebookDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Publish to Gradebook"
        description={`Publishing grade for ${getStudentName(job)}`}
        submitting={publishing}
        onConfirm={async (assessmentId, comment) => {
          setPublishing(true);
          await onPublish(job.id, assessmentId, comment);
          setPublishing(false);
        }}
      />
    </Card>
  );
}
