'use client';

import { useState } from 'react';
import { Clock, FileText, Star, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import type { AssignmentSubmission, Rubric, RubricScore, GradeSubmissionInput } from './types';
import { getTeacherName } from './types';

interface SubmissionViewerProps {
  submission: AssignmentSubmission;
  rubrics: Rubric[];
  onGrade: (data: GradeSubmissionInput) => Promise<void>;
  onRequestRevision: () => Promise<void>;
}

export function SubmissionViewer({
  submission, rubrics, onGrade, onRequestRevision,
}: SubmissionViewerProps) {
  const [selectedRubricId, setSelectedRubricId] = useState('');
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);
  const [comments, setComments] = useState('');
  const [mark, setMark] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [grading, setGrading] = useState(false);

  const selectedRubric = rubrics.find((r) => r.id === selectedRubricId);
  const isGraded = !!submission.gradedAt;

  const selectLevel = (criterionName: string, levelLabel: string, points: number) => {
    setRubricScores((prev) => {
      const existing = prev.filter((s) => s.criterionId !== criterionName);
      return [...existing, { criterionId: criterionName, level: levelLabel, points }];
    });
  };

  const handleGrade = async () => {
    if (!comments) return;
    setGrading(true);
    try {
      await onGrade({
        comments,
        rubricScores: rubricScores.length > 0 ? rubricScores : undefined,
        audioFeedbackUrl: audioUrl || undefined,
        mark: mark ? Number(mark) : undefined,
      });
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left panel - Submission details */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Submitted: {formatDate(submission.submittedAt)}</span>
            </div>
            {submission.isDraft && <Badge variant="secondary" className="bg-amber-100 text-amber-800">Draft</Badge>}
            {submission.isLate && <Badge variant="destructive">Late</Badge>}
            {isGraded && (
              <div className="text-sm">
                <p><strong>Mark:</strong> {submission.mark ?? 'N/A'}</p>
                <p><strong>Graded by:</strong> {getTeacherName(submission.gradedBy)}</p>
                <p><strong>Graded at:</strong> {formatDate(submission.gradedAt ?? '')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Files</CardTitle></CardHeader>
          <CardContent>
            {submission.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files attached.</p>
            ) : (
              <ul className="space-y-2">
                {submission.files.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <FileText className="h-4 w-4" /> File {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {submission.revisionHistory.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Revision History</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {submission.revisionHistory.map((rev, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <Badge variant="outline">v{rev.version}</Badge>
                    <span>{formatDate(rev.submittedAt)}</span>
                    <a href={rev.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {submission.peerReviews.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Peer Reviews</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {submission.peerReviews.map((pr, i) => (
                <div key={i} className="border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-sm">{pr.rating}/5</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{pr.comments}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(pr.reviewedAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isGraded && submission.teacherFeedback && (
          <Card>
            <CardHeader><CardTitle className="text-base">Teacher Feedback</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">{submission.teacherFeedback.comments}</p>
              </div>
              {submission.teacherFeedback.rubricScores.length > 0 && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">Rubric Scores:</p>
                  {submission.teacherFeedback.rubricScores.map((rs, i) => (
                    <p key={i} className="text-muted-foreground">{rs.criterionId}: {rs.level} ({rs.points} pts)</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right panel - Grading */}
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Grade Submission</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rubric (optional)</Label>
              <Select value={selectedRubricId} onValueChange={(v: unknown) => setSelectedRubricId(v as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select rubric..." /></SelectTrigger>
                <SelectContent>
                  {rubrics.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedRubric && (
              <div className="space-y-3">
                {selectedRubric.criteria.map((c) => (
                  <div key={c.name} className="rounded border p-3 space-y-2">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {c.levels.map((l) => {
                        const selected = rubricScores.find((s) => s.criterionId === c.name && s.level === l.label);
                        return (
                          <Button
                            key={l.label}
                            type="button"
                            size="xs"
                            variant={selected ? 'default' : 'outline'}
                            onClick={() => selectLevel(c.name, l.label, l.points)}
                          >
                            {l.label} ({l.points})
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Mark (optional numeric override)</Label>
              <Input type="number" value={mark} onChange={(e) => setMark(e.target.value)} placeholder="e.g. 78" min={0} />
            </div>
            <div className="space-y-2">
              <Label>Comments *</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Feedback comments..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Audio Feedback URL (optional)</Label>
              <Input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGrade} disabled={grading || !comments}>
                {grading ? 'Grading...' : 'Grade'}
              </Button>
              <Button variant="outline" onClick={onRequestRevision}>
                Request Revision
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
