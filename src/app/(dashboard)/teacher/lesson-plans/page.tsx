'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Eye, Pencil, BookOpen } from 'lucide-react';
import { formatDate, toISODate } from '@/lib/utils';
import {
  LessonPlanForm,
  LessonPlanDetailDialog,
  LessonPlanFilters,
  LessonPlanPagination,
} from '@/components/lesson-plans';
import { useTeacherLessonPlans } from '@/hooks/useTeacherLessonPlans';
import {
  getLessonPlanSubjectName,
  getLessonPlanClassName,
} from '@/lib/lesson-plan-helpers';
import type { LessonPlan } from '@/hooks/useTeacherLessonPlans';

interface EditingPlanData {
  id: string;
  classId: string;
  subjectId: string;
  curriculumTopicId?: string;
  date: string;
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homework?: string;
  reflectionNotes?: string;
}

interface PlanSubmitData {
  classId: string;
  subjectId: string;
  curriculumTopicId?: string;
  date: string;
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homework?: string;
  reflectionNotes?: string;
  aiGenerated?: boolean;
}

function planToEditingData(plan: LessonPlan): EditingPlanData {
  const subjectId = typeof plan.subjectId === 'string' ? plan.subjectId : plan.subjectId._id;
  const classId = typeof plan.classId === 'string' ? plan.classId : plan.classId._id;
  const topicId =
    plan.curriculumTopicId === undefined
      ? undefined
      : typeof plan.curriculumTopicId === 'string'
      ? plan.curriculumTopicId
      : plan.curriculumTopicId._id;
  return {
    id: plan._id,
    classId,
    subjectId,
    curriculumTopicId: topicId,
    date: toISODate(new Date(plan.date)),
    topic: plan.topic,
    objectives: plan.objectives,
    activities: plan.activities,
    resources: plan.resources,
    homework: plan.homework,
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

  const columns = useMemo<ColumnDef<LessonPlan, unknown>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'topic',
      header: 'Topic',
      cell: ({ row }) => (
        <span className="font-medium truncate block max-w-[200px]">{row.original.topic}</span>
      ),
    },
    {
      accessorKey: 'subjectId',
      header: 'Subject',
      cell: ({ row }) => (
        <span className="truncate block max-w-[200px]">{getLessonPlanSubjectName(row.original)}</span>
      ),
    },
    {
      accessorKey: 'classId',
      header: 'Class',
      cell: ({ row }) => (
        <span className="truncate block max-w-[200px]">{getLessonPlanClassName(row.original)}</span>
      ),
    },
    {
      accessorKey: 'objectives',
      header: 'Objectives',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.objectives.length} objective(s)
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 sm:h-9 sm:w-9"
            onClick={(e) => { e.stopPropagation(); handleViewPlan(row.original); }}
            aria-label="View lesson plan"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 sm:h-9 sm:w-9"
            onClick={(e) => { e.stopPropagation(); handleEditPlan(row.original); }}
            aria-label="Edit lesson plan"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 sm:h-9 sm:w-9 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); setDeleteTargetId(row.original._id); }}
            aria-label="Delete lesson plan"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  if (loading) return <LoadingSpinner />;

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
              : "Click 'New Lesson Plan' to create your first plan"
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
