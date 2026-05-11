'use client';

import { useState } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
    subjects,
    topics,
    loading,
    loadingTopics,
    saving,
    selectedClass,
    selectedSubject,
    selectedTerm,
    selectedYear,
    setSelectedClass,
    setSelectedSubject,
    setSelectedTerm,
    setSelectedYear,
    savePlan,
    checkClashes,
  } = useTermPlanner();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAssessment, setEditAssessment] = useState<PlannedAssessment | undefined>();
  const [clickedDate, setClickedDate] = useState('');
  const [pendingState, setPendingState] = useState<{ key: string; assessments: PlannedAssessment[] }>({
    key: '',
    assessments: [],
  });

  const selectionKey = `${selectedClass}:${selectedSubject}:${selectedTerm}:${selectedYear}`;
  const pendingAssessments = pendingState.key === selectionKey ? pendingState.assessments : [];
  const assessments = pendingAssessments.length > 0 ? pendingAssessments : plan?.plannedAssessments ?? [];
  const hasPendingChanges = pendingAssessments.length > 0;
  const hasSelections = Boolean(selectedClass && selectedSubject && selectedTerm && selectedYear);

  function resetPending() {
    setPendingState({ key: '', assessments: [] });
    setEditAssessment(undefined);
  }

  function handleDateClick(date: string) {
    checkClashes(date);
    setClickedDate(date);
    setEditAssessment(undefined);
    setDialogOpen(true);
  }

  function handleAssessmentClick(assessment: PlannedAssessment) {
    setClickedDate(assessment.plannedDate.slice(0, 10));
    setEditAssessment(assessment);
    setDialogOpen(true);
  }

  function handleFormSubmit(data: PlannedAssessment) {
    const nextAssessments = editAssessment
      ? assessments.map((assessment) => (assessment === editAssessment ? data : assessment))
      : [...assessments, data];

    setPendingState({
      key: selectionKey,
      assessments: nextAssessments.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)),
    });
  }

  async function handleSave() {
    const saved = await savePlan({ plannedAssessments: assessments });
    if (saved) {
      resetPending();
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setEditAssessment(undefined);
      setClickedDate('');
    }
  }

  function renderSelectionHint() {
    if (classes.length === 0) {
      return (
        <EmptyState
          icon={CalendarDays}
          title="No classes linked"
          description="Your teacher profile needs at least one linked class before you can plan the term."
        />
      );
    }

    if (selectedClass && subjects.length === 0) {
      return (
        <EmptyState
          icon={CalendarDays}
          title="No subjects linked"
          description="This class has no subject teaching load yet, so there is nothing to plan."
        />
      );
    }

    return (
      <EmptyState
        icon={CalendarDays}
        title="Select class, subject, and term"
        description="Choose a class, subject, term, and year above to load or create an assessment plan."
      />
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Term Assessment Planner"
        description="Plan assessment dates, weightings, and curriculum coverage for the term."
      >
        {hasPendingChanges && (
          <Badge variant="outline" className="border-amber-500 text-amber-700">
            Unsaved changes
          </Badge>
        )}
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_.7fr_.7fr_auto]">
        <Select
          value={selectedClass || undefined}
          disabled={loading || classes.length === 0}
          onValueChange={(val: unknown) => {
            setSelectedClass(val as string);
            resetPending();
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loading ? 'Loading classes...' : 'Select class'} />
          </SelectTrigger>
          <SelectContent>
            {classes.map((classInfo) => (
              <SelectItem key={classInfo.id} value={classInfo.id}>
                {classInfo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSubject || undefined}
          disabled={!selectedClass || subjects.length === 0}
          onValueChange={(val: unknown) => {
            setSelectedSubject(val as string);
            resetPending();
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}{subject.code ? ` (${subject.code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedTerm || undefined}
          onValueChange={(val: unknown) => {
            setSelectedTerm(val as string);
            resetPending();
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((term) => (
              <SelectItem key={term} value={String(term)}>
                Term {term}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedYear}
          onValueChange={(val: unknown) => {
            setSelectedYear(val as string);
            resetPending();
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasSelections && (
          <Button
            onClick={handleSave}
            disabled={saving || !hasPendingChanges}
            className="w-full xl:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Plan'}
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : !hasSelections ? (
        renderSelectionHint()
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
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

          <div className="lg:col-span-1">
            <WeightingSidebar weightings={weightings} />
          </div>
        </div>
      )}

      <AssessmentFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSubmit={handleFormSubmit}
        initialData={editAssessment}
        defaultDate={clickedDate}
        topics={topics}
        loadingTopics={loadingTopics}
      />
    </div>
  );
}
