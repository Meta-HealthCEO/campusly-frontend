'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { BookOpen, Calendar, Paperclip, CheckCircle, Clock, Send, ArrowLeft } from 'lucide-react';
import { useStudentHomeworkDetail } from '@/hooks/useStudentHomework';
import { formatDate } from '@/lib/utils';

export default function HomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;
  const { homework, submission, loading, submitHomework } = useStudentHomeworkDetail(homeworkId);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingSpinner />;

  if (!homework) {
    return (
      <EmptyState icon={BookOpen} title="Homework Not Found" description="The homework assignment does not exist."
        action={<Link href="/student/homework"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></Link>}
      />
    );
  }

  const isOverdue = new Date(homework.dueDate) < new Date();
  const hasSubmission = !!submission;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await submitHomework(content);
      toast.success('Homework submitted!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit homework');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/student/homework" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Back to Homework
      </Link>

      {/* TODO: lookup subject name via useSubjects(homework.subjectId) */}
      <PageHeader title={homework.title} description="" />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{homework.title}</CardTitle>
              {/* TODO: lookup subject name via useSubjects(homework.subjectId) */}
            </div>
            <Badge variant={hasSubmission ? 'default' : isOverdue ? 'destructive' : 'outline'}>
              {hasSubmission ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Due:</span><span>{formatDate(homework.dueDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Posted:</span><span>{formatDate(homework.createdAt)}</span>
            </div>
          </div>
          <Separator />
          {homework.attachments?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Attachments</h3>
              <div className="space-y-1">
                {homework.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-primary"><Paperclip className="h-3 w-3" />{att}</div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {submission ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" /><CardTitle className="text-lg">Your Submission</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4"><p className="text-sm">{submission.content}</p></div>
            <p className="text-xs text-muted-foreground">Submitted on {formatDate(submission.submittedAt)}</p>
            {submission.grade !== undefined && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Grade & Feedback</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <span className="text-lg font-bold text-primary">{submission.grade}%</span>
                    </div>
                    {submission.feedback && <p className="text-sm text-muted-foreground">{submission.feedback}</p>}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-lg">Submit Your Work</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="Type your answer or paste your work here..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-37.5" />
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!content.trim() || isOverdue || submitting}>
                <Send className="mr-2 h-4 w-4" />{submitting ? 'Submitting...' : 'Submit Homework'}
              </Button>
            </div>
            {isOverdue && <p className="text-sm text-destructive">This homework is past due. Late submissions are not accepted.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
