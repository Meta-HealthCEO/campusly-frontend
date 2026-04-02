'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Check, Send } from 'lucide-react';
import { GradingJobStatusBadge } from './GradingJobStatusBadge';
import type { GradingJob } from './types';

interface SubmissionCardProps {
  job: GradingJob;
  onReview: (jobId: string, finalMark: number, notes: string) => void;
  onPublish: (jobId: string) => void;
}

function getStudentName(job: GradingJob): string {
  if (typeof job.studentId === 'object' && job.studentId !== null) {
    return `${job.studentId.firstName} ${job.studentId.lastName}`;
  }
  return String(job.studentId);
}

export function SubmissionCard({ job, onReview, onPublish }: SubmissionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [finalMark, setFinalMark] = useState(
    job.teacherOverride?.finalMark ?? job.aiResult?.totalMark ?? 0,
  );
  const [teacherNotes, setTeacherNotes] = useState(
    job.teacherOverride?.teacherNotes ?? '',
  );

  const result = job.aiResult;
  const percentage = result && result.maxMark > 0
    ? Math.round((finalMark / result.maxMark) * 100)
    : 0;

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
              <p className="font-bold">{finalMark}/{result.maxMark}</p>
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
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Marks per Criterion
                </Label>
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
                    <div className="space-y-1">
                      <Label className="text-xs">Final Mark</Label>
                      <Input
                        type="number"
                        min={0}
                        max={result.maxMark}
                        value={finalMark}
                        onChange={(e) => setFinalMark(Number(e.target.value))}
                      />
                    </div>
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
                      <Button size="sm" onClick={() => onReview(job.id, finalMark, teacherNotes)}>
                        <Check className="mr-2 h-4 w-4" /> Approve
                      </Button>
                    )}
                    {(job.status === 'completed' || job.status === 'reviewed') && (
                      <Button size="sm" variant="outline" onClick={() => onPublish(job.id)}>
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
        </div>
      )}
    </Card>
  );
}
