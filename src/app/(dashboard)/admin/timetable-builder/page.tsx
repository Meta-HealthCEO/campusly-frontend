'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { WizardNavigation } from '@/components/timetable-builder/WizardNavigation';
import { PeriodConfigStep } from '@/components/timetable-builder/PeriodConfigStep';
import { SubjectRequirementsStep } from '@/components/timetable-builder/SubjectRequirementsStep';
import { TeacherAvailabilityStep } from '@/components/timetable-builder/TeacherAvailabilityStep';
import { SubjectLinesStep } from '@/components/timetable-builder/SubjectLinesStep';
import { LockSlotsStep } from '@/components/timetable-builder/LockSlotsStep';
import { GenerateReviewStep } from '@/components/timetable-builder/GenerateReviewStep';
import { useTimetableConfig } from '@/hooks/useTimetableConfig';
import { useTimetableRequirements } from '@/hooks/useTimetableRequirements';
import { useTimetableGenerator } from '@/hooks/useTimetableGenerator';
import { useGrades, useClasses, useSubjects } from '@/hooks/useAcademics';
import { useStaff } from '@/hooks/useStaff';
import type { LockedSlot } from '@/types';

const STEP_LABELS = [
  'Periods', 'Subjects', 'Availability', 'Lines', 'Lock Slots', 'Generate',
];
const TOTAL_STEPS = STEP_LABELS.length;
const FET_GRADE_NAMES = ['Grade 10', 'Grade 11', 'Grade 12'];

export default function TimetableBuilderPage() {
  const [step, setStep] = useState(1);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [lockedSlots, setLockedSlots] = useState<LockedSlot[]>([]);

  const { config, loading: configLoading, loadConfig, saveConfig, loadAvailability, availability, saveAvailability, applyDefaults } = useTimetableConfig();
  const { requirements, lines, loading: reqLoading, loadRequirements, saveRequirement, deleteRequirement, loadLines, saveLine, deleteLine, suggestLines } = useTimetableRequirements();
  const { generation, generating, generate, commitGeneration } = useTimetableGenerator();
  const { grades, loading: gradesLoading } = useGrades();
  const { classes, loading: classesLoading } = useClasses(selectedGradeId || undefined);
  const { subjects, loading: subjectsLoading } = useSubjects();
  const { staffList: teachers, loading: staffLoading, fetchStaff } = useStaff();

  const selectedGrade = grades.find((g) => g.id === selectedGradeId);
  const isFET = selectedGrade ? FET_GRADE_NAMES.includes(selectedGrade.name) : false;

  // Load initial data
  useEffect(() => { loadConfig(); fetchStaff(); }, [loadConfig, fetchStaff]);
  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  // Load grade-specific data when grade changes
  useEffect(() => {
    if (selectedGradeId) {
      loadRequirements(selectedGradeId);
      loadLines(selectedGradeId);
    }
  }, [selectedGradeId, loadRequirements, loadLines]);

  const canProceed = useCallback((): boolean => {
    if (step === 1) return config !== null;
    if (step === 2) return requirements.length > 0;
    return true;
  }, [step, config, requirements]);

  function handleNext() {
    if (step < TOTAL_STEPS && canProceed()) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function handleLock(slot: LockedSlot) {
    setLockedSlots((prev) => [...prev, slot]);
  }

  function handleUnlock(day: string, period: number) {
    setLockedSlots((prev) => prev.filter((s) => !(s.day === day && s.period === period)));
  }

  const initialLoading = configLoading || gradesLoading || subjectsLoading || staffLoading;

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable Builder"
        description="Configure constraints and generate an optimized school timetable."
      />

      <WizardNavigation
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        stepLabels={STEP_LABELS}
        onStepClick={setStep}
        canProceed={canProceed()}
        onNext={handleNext}
        onBack={handleBack}
      />

      <div className="mt-6">
        {step === 1 && (
          <PeriodConfigStep config={config} onSave={saveConfig} onApplyDefaults={applyDefaults} />
        )}
        {step === 2 && (
          <SubjectRequirementsStep
            requirements={requirements}
            grades={grades}
            subjects={subjects}
            teachers={teachers}
            selectedGradeId={selectedGradeId}
            onGradeChange={setSelectedGradeId}
            onSave={saveRequirement}
            onDelete={deleteRequirement}
          />
        )}
        {step === 3 && (
          <TeacherAvailabilityStep
            availability={availability}
            teachers={teachers}
            config={config}
            onSave={saveAvailability}
          />
        )}
        {step === 4 && (
          <SubjectLinesStep
            lines={lines}
            subjects={subjects}
            gradeId={selectedGradeId}
            isFET={isFET}
            onSave={saveLine}
            onDelete={deleteLine}
            onSuggest={suggestLines}
          />
        )}
        {step === 5 && (
          <LockSlotsStep
            config={config}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            lockedSlots={lockedSlots}
            onLock={handleLock}
            onUnlock={handleUnlock}
          />
        )}
        {step === 6 && (
          <GenerateReviewStep
            generation={generation}
            config={config}
            classes={classes}
            generating={generating}
            lockedSlots={lockedSlots}
            onGenerate={generate}
            onCommit={commitGeneration}
            selectedGradeId={selectedGradeId}
          />
        )}
      </div>
    </div>
  );
}
