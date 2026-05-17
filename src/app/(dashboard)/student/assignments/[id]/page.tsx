'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { RichTextView } from '@/components/shared/RichTextView';
import { SubmissionFileUploader, type UploadedFile } from '@/components/assignments/SubmissionFileUploader';
import { useStudentAssignments } from '@/hooks/useStudentAssignments';
import type { StudentAssignmentItem } from '@/types/assignments';

export default function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getById, submit } = useStudentAssignments();
  const [assignment, setAssignment] = useState<StudentAssignmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getById(id).then((a) => {
      if (!cancelled) {
        setAssignment(a);
        setSubmitted(Boolean(a?.submission));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id, getById]);

  if (loading) return <LoadingSpinner />;
  if (!assignment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/student/assignments')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <p className="text-muted-foreground">Assignment not found.</p>
      </div>
    );
  }

  const subject = typeof assignment.subjectId === 'object' ? assignment.subjectId.name : '';
  const allowsText = assignment.submissionFormat === 'text' || assignment.submissionFormat === 'both';
  const allowsFile = assignment.submissionFormat === 'file' || assignment.submissionFormat === 'both';

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await submit(id, {
      files: allowsFile ? files.map(({ filename, url, sizeBytes, mimeType }) => ({
        filename, url, sizeBytes, mimeType,
      })) : [],
      textAnswer: allowsText ? text.trim() || undefined : undefined,
    });
    setSubmitting(false);
    if (result) {
      setSubmitted(true);
      setAssignment((current) => current
        ? {
            ...current,
            submission: {
              _id: result._id,
              status: result.status,
              submittedAt: result.submittedAt,
              totalMark: result.totalMark,
            },
          }
        : current);
      setText('');
      setFiles([]);
    }
  };

  const canSubmit =
    !submitting
    && (
      (allowsText && text.trim().length > 0)
      || (allowsFile && files.length > 0)
    );
  const submittedAt = assignment.submission?.submittedAt;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/student/assignments')}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to assignments
      </Button>

      <PageHeader
        title={assignment.title}
        description={`${subject} · ${assignment.totalMarks} marks`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <RichTextView html={assignment.brief} />
        </CardContent>
      </Card>

      {assignment.rubric.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How you&apos;ll be marked</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {assignment.rubric.map((c) => (
                <li key={c._id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{c.name}</p>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {c.maxMarks} marks
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit your work</CardTitle>
          <p className="text-sm text-muted-foreground">
            Format: {assignment.submissionFormat === 'both'
              ? 'File or typed response'
              : assignment.submissionFormat === 'file'
                ? 'File upload required'
                : 'Typed response required'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="font-medium text-emerald-900">
                {submittedAt
                  ? `Submitted ${new Date(submittedAt).toLocaleString()}`
                  : 'Submitted successfully.'}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                Your teacher will mark this against the rubric. You can re-submit while
                the assignment is open — your latest version replaces the previous one.
              </p>
            </div>
          )}

          {allowsFile && (
            <SubmissionFileUploader
              files={files}
              onChange={setFiles}
              disabled={submitting}
            />
          )}

          {allowsText && (
            <div className="space-y-1.5">
              <Label>Typed response</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder="Write or paste your response here…"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {text.length}/100,000 characters
              </p>
            </div>
          )}

          {!allowsText && !allowsFile && (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
              <p>This assignment doesn&apos;t accept any submission format yet. Ask your teacher.</p>
            </div>
          )}

          <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
