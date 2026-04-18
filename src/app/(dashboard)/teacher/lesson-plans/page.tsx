'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable } from '@/components/shared/DataTable';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, BookOpen, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { toISODate } from '@/lib/utils';
import {
  LessonPlanForm,
  LessonPlanDetailDialog,
  LessonPlanFilters,
  LessonPlanPagination,
  buildLessonPlanColumns,
} from '@/components/lesson-plans';
import { useTeacherLessonPlans } from '@/hooks/useTeacherLessonPlans';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type { LessonPlan, StagedHomework } from '@/types';

interface EditingPlanData {
  id: string;
  classId: string;
  subjectId: string;
  curriculumTopicId: string;
  date: string;
  topic: string;
  durationMinutes: number;
  objectives: string[];
  activities: string[];
  resources: string[];
  reflectionNotes?: string;
}

interface PlanSubmitData {
  classId: string;
  subjectId: string;
  curriculumTopicId: string;
  date: string;
  topic: string;
  durationMinutes: number;
  objectives: string[];
  activities: string[];
  resources: string[];
  stagedHomework?: StagedHomework[];
  reflectionNotes?: string;
  aiGenerated?: boolean;
}

function planToEditingData(plan: LessonPlan): EditingPlanData {
  const subjectId = typeof plan.subjectId === 'string' ? plan.subjectId : plan.subjectId._id;
  const classId = typeof plan.classId === 'string' ? plan.classId : plan.classId._id;
  const topicId =
    typeof plan.curriculumTopicId === 'string'
      ? plan.curriculumTopicId
      : plan.curriculumTopicId._id;
  return {
    id: plan._id,
    classId,
    subjectId,
    curriculumTopicId: topicId,
    date: toISODate(new Date(plan.date)),
    topic: plan.topic,
    durationMinutes: plan.durationMinutes ?? 45,
    objectives: plan.objectives,
    activities: plan.activities,
    resources: plan.resources,
    reflectionNotes: plan.reflectionNotes,
  };
}

export default function TeacherLessonPlansPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<EditingPlanData | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const {
    plans, classes, subjects, loading, selectedPlan, setSelectedPlan,
    fetchPlan, createPlan, updatePlan, deletePlan, aiGenerate, aiGenerating,
    page, setPage, total, totalPages,
    filterSubjectId, setFilterSubjectId,
    filterClassId, setFilterClassId,
    curriculumTopics, topicsLoading, loadTopicsForSubject,
  } = useTeacherLessonPlans();

  const { classes: teacherClasses, loading: classesLoading } = useTeacherClasses();

  const handleViewPlan = (plan: LessonPlan) => {
    fetchPlan(plan._id);
    setDetailOpen(true);
  };

  const handleEditPlan = (plan: LessonPlan) => {
    const data = planToEditingData(plan);
    setEditing(data);
    if (data.subjectId) loadTopicsForSubject(data.subjectId);
    setFormOpen(true);
  };

  const handleNewPlan = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSubmit = async (data: PlanSubmitData) => {
    if (editing) {
      const success = await updatePlan(editing.id, data);
      if (success) {
        setFormOpen(false);
        setEditing(null);
      }
    } else {
      const success = await createPlan(data);
      if (success) setFormOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deletePlan(deleteTargetId);
    setDeleteTargetId(null);
  };

  const resetFilters = () => {
    setFilterSubjectId('');
    setFilterClassId('');
    setPage(1);
  };

  const hasFilters = !!(filterSubjectId || filterClassId);

  const columns = useMemo(
    () =>
      buildLessonPlanColumns({
        onView: handleViewPlan,
        onEdit: handleEditPlan,
        onDelete: (id: string) => setDeleteTargetId(id),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (loading || classesLoading) return <LoadingSpinner />;

  if ((teacherClasses?.length ?? 0) === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Lesson Plans"
          description="Plan and manage your lessons"
        />
        <EmptyState
          icon={GraduationCap}
          title="No classes yet"
          description="Create a class before planning lessons."
          action={
            <Link href="/teacher/classes" className="inline-block">
              <Button>Create your first class</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lesson Plans"
        description="Plan and manage your lessons"
      >
        <Button onClick={handleNewPlan}>
          <Plus className="mr-2 h-4 w-4" />
          New Lesson Plan
        </Button>
      </PageHeader>

      <LessonPlanFilters
        subjects={subjects}
        classes={classes}
        filterSubjectId={filterSubjectId}
        filterClassId={filterClassId}
        onSubjectChange={(val: string) => { setFilterSubjectId(val); setPage(1); }}
        onClassChange={(val: string) => { setFilterClassId(val); setPage(1); }}
        onReset={resetFilters}
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No lesson plans yet"
          description={
            hasFilters
              ? 'No plans match the current filters. Try clearing them.'
              : 'Plan your first lesson to get started.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : (
              <Button onClick={handleNewPlan}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first lesson plan
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={plans}
            searchKey="topic"
            searchPlaceholder="Search by topic..."
            onRowClick={handleViewPlan}
          />
          <LessonPlanPagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      <LessonPlanForm
        open={formOpen}
        onOpenChange={(v: boolean) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        classes={classes}
        subjects={subjects}
        topics={curriculumTopics}
        topicsLoading={topicsLoading}
        onSubjectChange={loadTopicsForSubject}
        onSubmit={handleSubmit}
        onAIGenerate={aiGenerate}
        aiGenerating={aiGenerating}
        initialData={editing ?? undefined}
      />

      <LessonPlanDetailDialog
        plan={selectedPlan}
        open={detailOpen}
        onOpenChange={(v: boolean) => {
          setDetailOpen(v);
          if (!v) setSelectedPlan(null);
        }}
      />

      <Dialog
        open={deleteTargetId !== null}
        onOpenChange={(v: boolean) => {
          if (!v) setDeleteTargetId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete lesson plan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This action cannot be undone. The lesson plan will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
