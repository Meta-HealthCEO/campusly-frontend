'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  ArrowLeft, Sparkles, CheckCircle, Plus, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAITools } from '@/hooks/useAITools';
import type { ReviewGradePayload } from '@/hooks/useAITools';
import { useTeacherGradingAssignments } from '@/hooks/useTeacherGrading';
import { RubricBuilder } from '@/components/ai-tools/RubricBuilder';
import { SubmissionCard } from '@/components/ai-tools/SubmissionCard';
import { GradingProgressBar } from '@/components/ai-tools/GradingProgressBar';
import type { RubricCriterion } from '@/components/ai-tools/types';

export default function GradingPage() {
  const { user } = useAuthStore();
  const {
    gradingJobs,
    submitGrade, submitBulkGrade,
    pollGradingJob, stopAllPolling,
    reviewGrade, publishGrade,
    retryGrade, loadIncompleteGradingJobs,
  } = useAITools();
  const { assignments, loadingAssignments } = useTeacherGradingAssignments();

  const [selectedAssignment, setSelectedAssignment] = useState('');

  // Single submission form
  const [studentId, setStudentId] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [rubric, setRubric] = useState<RubricCriterion[]>([
    { criterion: 'Content & Ideas', maxScore: 10, description: 'Quality and relevance of ideas' },
    { criterion: 'Language & Grammar', maxScore: 8, description: 'Grammatical accuracy' },
    { criterion: 'Structure & Organisation', maxScore: 7, description: 'Logical flow' },
    { criterion: 'Vocabulary', maxScore: 5, description: 'Range and appropriateness' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Bulk grading tracking
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkCompleted, setBulkCompleted] = useState(0);
  const [bulkGrading, setBulkGrading] = useState(false);

  // Restore incomplete grading jobs when assignment changes (session-safe)
  useEffect(() => {
    if (!selectedAssignment) return;
    let cancelled = false;
    loadIncompleteGradingJobs(selectedAssignment).then((jobs) => {
      if (cancelled) return;
      jobs.forEach((job) => {
        if (job.status === 'queued' || job.status === 'grading') {
          pollGradingJob(job.id);
        }
      });
    });
    return () => {
      cancelled = true;
      stopAllPolling();
    };
  }, [selectedAssignment, loadIncompleteGradingJobs, pollGradingJob, stopAllPolling]);

  const handleSubmitSingle = async () => {
    if (!user?.schoolId || !selectedAssignment || !studentId || !submissionText) return;
    const validRubric = rubric.filter(r => r.criterion && r.maxScore > 0 && r.description);
    if (validRubric.length === 0) return;

    setSubmitting(true);
    const job = await submitGrade({
      schoolId: user.schoolId,
      assignmentId: selectedAssignment,
      studentId,
      submissionText,
      rubric: validRubric,
    });
    if (job) {
      pollGradingJob(job.id);
      setSubmissionText('');
      setStudentId('');
    }
    setSubmitting(false);
  };

  const handleBulkGrade = useCallback(async () => {
    if (!user?.schoolId || !selectedAssignment) return;
    const ungradedJobs = gradingJobs.filter(
      j => j.status === 'queued' || j.status === 'grading',
    );
    if (ungradedJobs.length === 0) return;

    const validRubric = rubric.filter(r => r.criterion && r.maxScore > 0 && r.description);
    if (validRubric.length === 0) return;

    setBulkGrading(true);
    setBulkTotal(ungradedJobs.length);
    setBulkCompleted(0);

    const submissions = ungradedJobs.map(j => ({
      studentId: typeof j.studentId === 'object' ? j.studentId._id : j.studentId,
      submissionText: j.submissionText,
    }));

    const jobs = await submitBulkGrade({
      schoolId: user.schoolId,
      assignmentId: selectedAssignment,
      submissions,
      rubric: validRubric,
    });

    jobs.forEach(job => {
      pollGradingJob(job.id, () => {
        setBulkCompleted(prev => {
          const next = prev + 1;
          if (next >= jobs.length) {
            setBulkGrading(false);
          }
          return next;
        });
      });
    });
  }, [user, selectedAssignment, gradingJobs, rubric, submitBulkGrade, pollGradingJob]);

  const handleReview = useCallback(async (jobId: string, payload: ReviewGradePayload) => {
    await reviewGrade(jobId, payload);
  }, [reviewGrade]);

  const handlePublish = useCallback(async (jobId: string, assessmentId: string, comment?: string) => {
    await publishGrade(jobId, assessmentId, comment);
  }, [publishGrade]);

  const handleRetry = useCallback(async (jobId: string) => {
    const job = await retryGrade(jobId);
    if (job) {
      pollGradingJob(job.id);
    }
  }, [retryGrade, pollGradingJob]);

  const handleApproveAll = useCallback(async () => {
    const completedJobs = gradingJobs.filter(j => j.status === 'completed');
    for (const job of completedJobs) {
      const mark = job.aiResult?.totalMark ?? 0;
      await reviewGrade(job.id, { finalMark: mark });
    }
  }, [gradingJobs, reviewGrade]);

  const queuedCount = gradingJobs.filter(j => j.status === 'queued' || j.status === 'grading').length;
  const completedCount = gradingJobs.filter(j => j.status === 'completed').length;
  const reviewedCount = gradingJobs.filter(j => j.status === 'reviewed' || j.status === 'published').length;

  return (
    <div className="space-y-6">
      <PageHeader title="AI Grading Hub" description="Grade student submissions with AI assistance">
        <Link href={ROUTES.TEACHER_AI_TOOLS}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to AI Tools
          </Button>
        </Link>
      </PageHeader>

      {/* Assignment Selection */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label>Select Assignment</Label>
          {loadingAssignments ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assignments...
            </div>
          ) : (
            <Select value={selectedAssignment} onValueChange={(v: unknown) => v && setSelectedAssignment(v as string)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose assignment..." />
              </SelectTrigger>
              <SelectContent>
                {assignments.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex gap-2">
          {completedCount > 0 && (
            <Button variant="outline" onClick={handleApproveAll}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve All ({completedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Bulk grading progress */}
      {bulkGrading && (
        <GradingProgressBar completed={bulkCompleted} total={bulkTotal} />
      )}

      {/* Status summary */}
      <div className="flex gap-3">
        <Badge variant="outline" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" /> {queuedCount} Queued
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" /> {completedCount} AI Graded
        </Badge>
        <Badge variant="default" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> {reviewedCount} Reviewed
        </Badge>
      </div>

      {/* Submit Single Submission */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit for AI Grading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Student ID</Label>
            <Input
              placeholder="Enter student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Submission Text</Label>
            <Textarea
              placeholder="Paste or type the student's submission..."
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              rows={4}
            />
          </div>
          <RubricBuilder rubric={rubric} onChange={setRubric} />
          <div className="flex gap-2">
            <Button
              onClick={handleSubmitSingle}
              disabled={submitting || !selectedAssignment || !studentId || !submissionText}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {submitting ? 'Submitting...' : 'Grade with AI'}
            </Button>
            {queuedCount > 0 && (
              <Button variant="outline" onClick={handleBulkGrade} disabled={bulkGrading}>
                <Plus className="mr-2 h-4 w-4" />
                Bulk Grade ({queuedCount})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grading Jobs List */}
      {gradingJobs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Submissions</h3>
          {gradingJobs.map(job => (
            <SubmissionCard
              key={job.id}
              job={job}
              onReview={handleReview}
              onPublish={handlePublish}
              onRetry={handleRetry}
            />
          ))}
        </div>
      )}

      {gradingJobs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Grading Jobs</h3>
            <p className="text-sm text-muted-foreground">
              Select an assignment and submit a student&apos;s work for AI grading.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
