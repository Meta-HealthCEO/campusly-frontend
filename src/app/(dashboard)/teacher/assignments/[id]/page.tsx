'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle, Archive } from 'lucide-react';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssignmentBriefTab } from '@/components/assignments/AssignmentBriefTab';
import { AssignmentRubricTab } from '@/components/assignments/AssignmentRubricTab';
import { AssignmentClassesTab } from '@/components/assignments/AssignmentClassesTab';
import { AssignmentSubmissionsTab } from '@/components/assignments/AssignmentSubmissionsTab';
import type { Assignment, AssignmentStatus } from '@/types/assignments';

function statusVariant(s: AssignmentStatus): 'default' | 'secondary' | 'outline' {
  if (s === 'published') return 'default';
  if (s === 'archived') return 'outline';
  return 'secondary';
}

export default function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getById, update } = useTeacherAssignments();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const fresh = await getById(id);
    setAssignment(fresh);
  }, [id, getById]);

  useEffect(() => {
    let cancelled = false;
    void getById(id).then((a) => {
      if (!cancelled) {
        setAssignment(a);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id, getById]);

  if (loading) return <LoadingSpinner />;
  if (!assignment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/assignments')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <p className="text-muted-foreground">Assignment not found.</p>
      </div>
    );
  }

  const subject = typeof assignment.subjectId === 'object' ? assignment.subjectId.name : '';
  const grade = typeof assignment.gradeId === 'object' ? assignment.gradeId.name : '';
  const description = [
    subject,
    grade,
    `${assignment.totalMarks} marks`,
    `${assignment.rubric.length} criteria`,
  ].filter(Boolean).join(' \u00B7 ');

  const handlePublish = async () => {
    const updated = await update(assignment._id, { status: 'published' });
    if (updated) setAssignment(updated);
  };

  const handleArchive = async () => {
    const updated = await update(assignment._id, { status: 'archived' });
    if (updated) setAssignment(updated);
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/teacher/assignments')}
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <PageHeader title={assignment.title} description={description}>
        <div className="flex gap-2 flex-wrap items-center">
          <Badge variant={statusVariant(assignment.status)} className="capitalize">
            {assignment.status}
          </Badge>
          {assignment.status === 'draft' && (
            <Button size="sm" onClick={() => void handlePublish()}>
              <CheckCircle className="h-4 w-4 mr-1" /> Publish
            </Button>
          )}
          {assignment.status !== 'archived' && (
            <Button size="sm" variant="outline" onClick={() => void handleArchive()}>
              <Archive className="h-4 w-4 mr-1" /> Archive
            </Button>
          )}
        </div>
      </PageHeader>

      <Tabs defaultValue="brief">
        <TabsList>
          <TabsTrigger value="brief">Brief</TabsTrigger>
          <TabsTrigger value="rubric">Rubric</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="brief">
          <AssignmentBriefTab assignment={assignment} onChanged={reload} />
        </TabsContent>
        <TabsContent value="rubric">
          <AssignmentRubricTab assignment={assignment} onChanged={reload} />
        </TabsContent>
        <TabsContent value="classes">
          <AssignmentClassesTab assignment={assignment} onChanged={reload} />
        </TabsContent>
        <TabsContent value="submissions">
          <AssignmentSubmissionsTab assignment={assignment} onChanged={reload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
