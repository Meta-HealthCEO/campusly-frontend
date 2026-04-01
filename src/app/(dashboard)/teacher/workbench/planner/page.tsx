'use client';

import { useState } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PlannerCalendar } from '@/components/workbench/planner/PlannerCalendar';
import { WeightingSidebar } from '@/components/workbench/planner/WeightingSidebar';
import { AssessmentFormDialog } from '@/components/workbench/planner/AssessmentFormDialog';
import { useTermPlanner } from '@/hooks/useTermPlanner';
import type { PlannedAssessment } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export default function TermPlannerPage() {
  const {
    plan,
    clashes,
    weightings,
    classes,
    loading,
    saving,
    selectedClass,
    selectedTerm,
    selectedYear,
    setSelectedClass,
    setSelectedTerm,
    setSelectedYear,
    savePlan,
    checkClashes,
  } = useTermPlanner();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAssessment, setEditAssessment] = useState<PlannedAssessment | undefined>();
  const [pendingAssessments, setPendingAssessments] = useState<PlannedAssessment[]>([]);

  const assessments =
    pendingAssessments.length > 0
      ? pendingAssessments
      : plan?.plannedAssessments ?? [];

  function handleDateClick(date: string) {
    checkClashes(date);
    setEditAssessment(undefined);
    setDialogOpen(true);
  }

  function handleAssessmentClick(assessment: PlannedAssessment) {
    setEditAssessment(assessment);
    setDialogOpen(true);
  }

  function handleFormSubmit(data: PlannedAssessment) {
    if (editAssessment) {
      setPendingAssessments(
        assessments.map((a) =>
          a.title === editAssessment.title && a.plannedDate === editAssessment.plannedDate
            ? data
            : a,
        ),
      );
    } else {
      setPendingAssessments([...assessments, data]);
    }
  }

  function handleSave() {
    savePlan({ plannedAssessments: assessments });
  }

  const hasSelections = selectedClass && selectedTerm && selectedYear;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Term Assessment Planner"
        description="Plan and manage assessments for the term"
      />

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={selectedClass}
          onValueChange={(val: unknown) => setSelectedClass(val as string)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedTerm}
          onValueChange={(val: unknown) => setSelectedTerm(val as string)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((t) => (
              <SelectItem key={t} value={String(t)}>
                Term {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedYear}
          onValueChange={(val: unknown) => setSelectedYear(val as string)}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasSelections && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving…' : 'Save Plan'}
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : !hasSelections ? (
        <EmptyState
          icon={CalendarDays}
          title="Select class and term"
          description="Choose a class, term, and year above to load or create an assessment plan."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar — spans 3 cols on lg */}
          <div className="lg:col-span-3">
            <PlannerCalendar
              assessments={assessments}
              clashes={clashes}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onDateClick={handleDateClick}
              onAssessmentClick={handleAssessmentClick}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <WeightingSidebar weightings={weightings} />
          </div>
        </div>
      )}

      <AssessmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleFormSubmit}
        initialData={editAssessment}
        topics={[]}
      />
    </div>
  );
}
