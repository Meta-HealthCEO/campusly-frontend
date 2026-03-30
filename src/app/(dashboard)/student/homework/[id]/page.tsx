'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  BookOpen,
  Calendar,
  User,
  Paperclip,
  CheckCircle,
  Clock,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { mockHomework, mockSubmissions, mockStudents } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

const currentStudent = mockStudents[0];

export default function HomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;
  const homework = mockHomework.find((hw) => hw.id === homeworkId);
  const submission = mockSubmissions.find(
    (s) => s.homeworkId === homeworkId && s.studentId === currentStudent.id
  );

  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!homework) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Homework Not Found"
        description="The homework assignment you are looking for does not exist."
        action={
          <Link href="/student/homework">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Homework
            </Button>
          </Link>
        }
      />
    );
  }

  const isOverdue = new Date(homework.dueDate) < new Date();
  const hasSubmission = !!submission || submitted;

  const handleSubmit = () => {
    if (content.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/student/homework"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Homework
      </Link>

      <PageHeader title={homework.title} description={homework.subject.name} />

      {/* Homework Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{homework.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {homework.subject.name}
              </p>
            </div>
            <Badge
              variant={
                hasSubmission
                  ? 'default'
                  : isOverdue
                  ? 'destructive'
                  : 'outline'
              }
            >
              {hasSubmission ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Teacher:</span>
              <span>
                {homework.teacher.user.firstName}{' '}
                {homework.teacher.user.lastName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span>{formatDate(homework.dueDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Posted:</span>
              <span>{formatDate(homework.createdAt)}</span>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-medium">Description</h3>
            <p className="text-sm text-muted-foreground">
              {homework.description}
            </p>
          </div>

          {homework.attachments.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Attachments</h3>
              <div className="space-y-1">
                {homework.attachments.map((attachment, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-primary"
                  >
                    <Paperclip className="h-3 w-3" />
                    {attachment}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Section */}
      {submission ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-lg">Your Submission</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm">{submission.content}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted on {formatDate(submission.submittedAt)}
            </p>

            {submission.grade !== undefined && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Grade & Feedback</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <span className="text-lg font-bold text-primary">
                        {submission.grade}%
                      </span>
                    </div>
                    {submission.feedback && (
                      <p className="text-sm text-muted-foreground">
                        {submission.feedback}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : submitted ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <h3 className="text-lg font-semibold">Submitted Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              Your homework has been submitted. Your teacher will grade it soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submit Your Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Textarea
                placeholder="Type your answer or paste your work here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isOverdue}
              >
                <Send className="mr-2 h-4 w-4" />
                Submit Homework
              </Button>
            </div>
            {isOverdue && (
              <p className="text-sm text-destructive">
                This homework is past due. Late submissions are not accepted.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
