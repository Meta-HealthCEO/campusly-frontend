'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useLearningStore } from '@/stores/useLearningStore';
import { useLearningApi } from '@/hooks/useLearningApi';
import { StrugglingStudentsAlert } from '@/components/learning/StrugglingStudentsAlert';
import { SubmissionViewer } from '@/components/learning/SubmissionViewer';
import { useTeacherLearning } from '@/hooks/useTeacherLearning';
import type { AssignmentSubmission } from '@/components/learning/types';
import { formatDate } from '@/lib/utils';

const submissionColumns: ColumnDef<AssignmentSubmission>[] = [
  {
    id: 'student',
    header: 'Student',
    cell: ({ row }) => {
      const sid = row.original.studentId;
      return <span className="font-medium">{typeof sid === 'string' ? sid : sid?._id ?? ''}</span>;
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      if (row.original.isDraft) return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Draft</Badge>;
      if (row.original.gradedAt) return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Graded</Badge>;
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Submitted</Badge>;
    },
  },
  { id: 'date', header: 'Submitted', cell: ({ row }) => formatDate(row.original.submittedAt) },
  { id: 'mark', header: 'Mark', cell: ({ row }) => row.original.mark ?? '—' },
  {
    id: 'late',
    header: 'Late',
    cell: ({ row }) => row.original.isLate ? <Badge variant="destructive">Late</Badge> : '—',
  },
  { id: 'revisions', header: 'Revisions', cell: ({ row }) => row.original.revisionHistory?.length ?? 0 },
];

export default function TeacherLearningPage() {
  const { submissions, submissionsLoading, rubrics } = useLearningStore();
  const {
    fetchSubmissions, fetchRubrics, gradeSubmission, requestRevision,
    enablePeerReview,
  } = useLearningApi();

  const { classes, homework } = useTeacherLearning();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedHomeworkId, setSelectedHomeworkId] = useState('');
  const [viewingSubmission, setViewingSubmission] = useState<AssignmentSubmission | null>(null);

  // Trigger rubric fetch on mount (the hook loads classes/homework)
  useEffect(() => { fetchRubrics(); }, []);

  if (viewingSubmission) {
    return (
      <div className="space-y-6">
        <PageHeader title="Grade Submission" description="Review and grade this student submission.">
          <Button variant="outline" onClick={() => setViewingSubmission(null)}>Back</Button>
        </PageHeader>
        <SubmissionViewer
          submission={viewingSubmission}
          rubrics={rubrics}
          onGrade={async (data) => {
            await gradeSubmission(viewingSubmission.id, data);
            if (selectedHomeworkId) fetchSubmissions(selectedHomeworkId);
            setViewingSubmission(null);
          }}
          onRequestRevision={async () => {
            await requestRevision(viewingSubmission.id);
            if (selectedHomeworkId) fetchSubmissions(selectedHomeworkId);
            setViewingSubmission(null);
          }}
        />
      </div>
    );
  }

  const submissionColumnsWithActions: ColumnDef<AssignmentSubmission>[] = [
    ...submissionColumns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button size="xs" variant="outline" onClick={() => setViewingSubmission(row.original)}>
          {row.original.gradedAt ? 'View' : 'Grade'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Learning Management" description="Grade submissions, track progress, and identify struggling students." />

      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="struggling">Struggling Students</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Homework</Label>
              <Select value={selectedHomeworkId} onValueChange={(v: unknown) => {
                setSelectedHomeworkId(v as string);
                fetchSubmissions(v as string);
              }}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Select homework..." /></SelectTrigger>
                <SelectContent>
                  {homework.map((h) => <SelectItem key={h._id} value={h._id}>{h.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedHomeworkId && (
              <div className="flex items-end">
                <Button variant="outline" onClick={() => enablePeerReview(selectedHomeworkId)}>
                  Enable Peer Review
                </Button>
              </div>
            )}
          </div>

          {!selectedHomeworkId ? (
            <EmptyState icon={BookOpen} title="Select Homework" description="Choose a homework assignment to view submissions." />
          ) : submissionsLoading ? (
            <LoadingSpinner />
          ) : submissions.length === 0 ? (
            <EmptyState icon={BookOpen} title="No Submissions" description="No submissions for this assignment yet." />
          ) : (
            <DataTable columns={submissionColumnsWithActions} data={submissions} searchKey="studentId" searchPlaceholder="Search submissions..." />
          )}
        </TabsContent>

        <TabsContent value="struggling" className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Class</Label>
            <Select value={selectedClassId} onValueChange={(v: unknown) => setSelectedClassId(v as string)}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select class..." /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedClassId ? (
            <StrugglingStudentsAlert classId={selectedClassId} />
          ) : (
            <EmptyState icon={AlertTriangle} title="Select a Class" description="Choose a class to view struggling students." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
