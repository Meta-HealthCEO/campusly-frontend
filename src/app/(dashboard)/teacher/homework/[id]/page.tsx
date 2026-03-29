'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Users,
  Save,
  CheckCircle,
} from 'lucide-react';
import { mockHomework, mockSubmissions } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface GradeData {
  marks: string;
  feedback: string;
}

export default function TeacherHomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;
  const homework = mockHomework.find((hw) => hw.id === homeworkId);
  const submissions = mockSubmissions.filter(
    (s) => s.homeworkId === homeworkId
  );

  const [grades, setGrades] = useState<Record<string, GradeData>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  if (!homework) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Homework Not Found"
        description="The homework assignment you are looking for does not exist."
        action={
          <Link href="/teacher/homework">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Homework
            </Button>
          </Link>
        }
      />
    );
  }

  const getGradeData = (submissionId: string): GradeData => {
    if (grades[submissionId]) return grades[submissionId];
    const submission = submissions.find((s) => s.id === submissionId);
    return {
      marks: submission?.grade !== undefined ? String(submission.grade) : '',
      feedback: submission?.feedback || '',
    };
  };

  const updateGrade = (submissionId: string, field: keyof GradeData, value: string) => {
    setGrades((prev) => ({
      ...prev,
      [submissionId]: {
        ...getGradeData(submissionId),
        [field]: value,
      },
    }));
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(submissionId);
      return next;
    });
  };

  const handleSave = (submissionId: string) => {
    setSavedIds((prev) => new Set(prev).add(submissionId));
  };

  const gradedCount = submissions.filter(
    (s) => s.status === 'graded' || savedIds.has(s.id)
  ).length;

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/homework"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Homework
      </Link>

      {/* Homework Info */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{homework.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {homework.subject.name}
              </p>
            </div>
            <Badge
              variant={
                homework.status === 'published' ? 'default' : 'secondary'
              }
            >
              {homework.status}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Due: {formatDate(homework.dueDate)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {submissions.length} submissions
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              {gradedCount} graded
            </span>
          </div>
          <p className="mt-3 text-sm">{homework.description}</p>
        </CardContent>
      </Card>

      {/* Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No submissions yet.
            </p>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => {
                const gradeData = getGradeData(submission.id);
                const isSaved = savedIds.has(submission.id);
                const isAlreadyGraded = submission.status === 'graded';

                return (
                  <div
                    key={submission.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {submission.student.user.firstName}{' '}
                          {submission.student.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {formatDate(submission.submittedAt, 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                      <Badge
                        variant={
                          isAlreadyGraded || isSaved
                            ? 'default'
                            : submission.status === 'late'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {isSaved
                          ? 'Graded'
                          : submission.status}
                      </Badge>
                    </div>

                    {submission.content && (
                      <div className="rounded bg-muted/50 p-3">
                        <p className="text-sm">{submission.content}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Marks (%)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={gradeData.marks}
                          onChange={(e) =>
                            updateGrade(
                              submission.id,
                              'marks',
                              e.target.value
                            )
                          }
                          placeholder="0-100"
                          className="w-24"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Feedback
                        </label>
                        <Textarea
                          value={gradeData.feedback}
                          onChange={(e) =>
                            updateGrade(
                              submission.id,
                              'feedback',
                              e.target.value
                            )
                          }
                          placeholder="Write feedback..."
                          className="min-h-[60px]"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSave(submission.id)}
                        disabled={isSaved || !gradeData.marks}
                      >
                        <Save className="mr-1 h-3 w-3" />
                        {isSaved ? 'Saved' : 'Save'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
