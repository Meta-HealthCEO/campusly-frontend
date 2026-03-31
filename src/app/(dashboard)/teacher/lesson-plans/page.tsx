'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Plus, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { LessonPlanForm } from '@/components/attendance/LessonPlanForm';
import { useTeacherLessonPlans } from '@/hooks/useTeacherLessonPlans';
import type { LessonPlan } from '@/hooks/useTeacherLessonPlans';

function getSubjectName(plan: LessonPlan): string {
  if (typeof plan.subjectId === 'object' && plan.subjectId !== null) {
    return plan.subjectId.name ?? '';
  }
  return '';
}

function getClassName(plan: LessonPlan): string {
  if (typeof plan.classId === 'object' && plan.classId !== null) {
    return plan.classId.name ?? '';
  }
  return '';
}

const columns: ColumnDef<LessonPlan, unknown>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: 'topic',
    header: 'Topic',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.topic}</span>
    ),
  },
  {
    accessorKey: 'subjectId',
    header: 'Subject',
    cell: ({ row }) => getSubjectName(row.original),
  },
  {
    accessorKey: 'classId',
    header: 'Class',
    cell: ({ row }) => getClassName(row.original),
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
];

export default function TeacherLessonPlansPage() {
  const [open, setOpen] = useState(false);
  const { plans, classes, subjects, loading, createPlan, deletePlan } =
    useTeacherLessonPlans();

  const handleSubmit = async (data: {
    classId: string;
    subjectId: string;
    date: string;
    topic: string;
    objectives: string[];
    activities: string[];
    resources: string[];
    homework?: string;
    reflectionNotes?: string;
  }) => {
    const success = await createPlan(data);
    if (success) setOpen(false);
  };

  const actionColumns: ColumnDef<LessonPlan, unknown>[] = [
    ...columns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="ghost"
          className="text-red-500 hover:text-red-700"
          onClick={() => deletePlan(row.original._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lesson Plans"
        description="Plan and manage your lessons"
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Lesson Plan
        </Button>
      </PageHeader>

      <DataTable
        columns={actionColumns}
        data={plans}
        searchKey="topic"
        searchPlaceholder="Search by topic..."
      />

      <LessonPlanForm
        open={open}
        onOpenChange={setOpen}
        classes={classes}
        subjects={subjects}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
