'use client';

import { useEffect, useState, useMemo } from 'react';
import { CheckCircle2, FileText, Inbox, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import { resolveId } from '@/lib/api-helpers';
import { AssignmentMarkingDialog } from './AssignmentMarkingDialog';
import type {
  Assignment,
  AssignmentSubmission,
  AssignmentSubmissionStatus,
  PopulatedStudent,
} from '@/types/assignments';

interface Props {
  assignment: Assignment;
  onChanged: () => Promise<void>;
}

interface ClassGroup {
  classId: string;
  className: string;
  submissions: AssignmentSubmission[];
}

function studentName(student: AssignmentSubmission['studentId']): string {
  if (typeof student !== 'object' || student === null) return 'Unknown';
  const s = student as PopulatedStudent;
  if (s.userId?.firstName || s.userId?.lastName) {
    return `${s.userId.firstName ?? ''} ${s.userId.lastName ?? ''}`.trim();
  }
  return s.admissionNumber ?? 'Unknown';
}

function classDisplay(
  ref: AssignmentSubmission['classId'],
  fallbackName: string,
): string {
  if (typeof ref === 'object' && ref?.name) return ref.name;
  return fallbackName;
}

function statusBadge(status: AssignmentSubmissionStatus, percentage?: number) {
  switch (status) {
    case 'submitted':
      return (
        <Badge variant="outline" className="text-[10px]">
          <Clock className="mr-1 h-3 w-3" /> Submitted
        </Badge>
      );
    case 'marking':
      return (
        <Badge variant="outline" className="text-[10px]">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Marking
        </Badge>
      );
    case 'marked':
      return (
        <Badge variant="secondary" className="text-[10px]">
          Marked{typeof percentage === 'number' ? ` · ${percentage}%` : ''}
        </Badge>
      );
    case 'published':
      return (
        <Badge variant="default" className="text-[10px]">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Published
          {typeof percentage === 'number' ? ` · ${percentage}%` : ''}
        </Badge>
      );
  }
}

export function AssignmentSubmissionsTab({ assignment, onChanged }: Props) {
  const { listSubmissions } = useTeacherAssignments();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const list = await listSubmissions(assignment._id);
      if (!cancelled) {
        setSubmissions(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assignment._id, listSubmissions]);

  const groups = useMemo<ClassGroup[]>(() => {
    const map = new Map<string, ClassGroup>();
    for (const cls of assignment.assignedClasses) {
      const id = resolveId(cls.classId);
      const name = typeof cls.classId === 'object' && cls.classId
        ? cls.classId.name
        : id;
      map.set(id, { classId: id, className: name, submissions: [] });
    }
    for (const sub of submissions) {
      const id = resolveId(sub.classId);
      const existing = map.get(id);
      const name = classDisplay(sub.classId, id);
      if (existing) {
        existing.submissions.push(sub);
      } else {
        map.set(id, { classId: id, className: name, submissions: [sub] });
      }
    }
    return Array.from(map.values());
  }, [submissions, assignment.assignedClasses]);

  if (assignment.status !== 'published') {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Publish the assignment first"
        description="Drafts can't be assigned to classes, so there's nothing to mark yet."
      />
    );
  }

  if (assignment.assignedClasses.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Not pushed to a class yet"
        description="Push this assignment to a class on the Classes tab — student submissions will appear here for marking."
      />
    );
  }

  if (loading) return <LoadingSpinner />;

  const refresh = async () => {
    const list = await listSubmissions(assignment._id);
    setSubmissions(list);
    await onChanged();
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group.classId}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">{group.className}</CardTitle>
              <Badge variant="secondary">
                {group.submissions.length} submission{group.submissions.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {group.submissions.length === 0 ? (
              <p className="px-6 py-6 text-sm text-muted-foreground">
                No submissions yet from this class.
              </p>
            ) : (
              <ul className="divide-y">
                {group.submissions.map((sub) => {
                  const percentage = typeof sub.totalMark === 'number' && assignment.totalMarks > 0
                    ? Math.round((sub.totalMark / assignment.totalMarks) * 100)
                    : undefined;
                  return (
                    <li key={sub._id} className="flex items-center justify-between gap-3 px-6 py-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-medium truncate">{studentName(sub.studentId)}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>Submitted {new Date(sub.submittedAt).toLocaleString()}</span>
                          {sub.isLate && <Badge variant="destructive" className="text-[10px]">Late</Badge>}
                          {statusBadge(sub.status, percentage)}
                          {sub.files.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {sub.files.length} file{sub.files.length === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant={sub.status === 'submitted' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setReviewId(sub._id)}
                      >
                        {sub.status === 'submitted' ? 'Mark' : 'Review'}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      <AssignmentMarkingDialog
        open={reviewId !== null}
        onOpenChange={(open) => { if (!open) setReviewId(null); }}
        submissionId={reviewId}
        assignment={assignment}
        onMarked={() => { void refresh(); }}
      />
    </div>
  );
}
