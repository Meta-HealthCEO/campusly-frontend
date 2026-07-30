'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherOnboarding } from '@/hooks/useTeacherOnboarding';
import { useClasses, useGrades } from '@/hooks/useAcademics';
import { SchoolSetupStep } from '@/components/onboarding/SchoolSetupStep';
import type { SchoolSetupData } from '@/components/onboarding/SchoolSetupStep';
import { GradesSubjectsStep } from '@/components/onboarding/GradesSubjectsStep';
import { AddStudentsStep, type PendingStudent } from '@/components/onboarding/AddStudentsStep';
import { WizardFooter } from '@/components/shared/WizardFooter';
import { GRADE_LEVELS } from '@/lib/constants';
import { resolveId } from '@/lib/api-helpers';
import type { Grade } from '@/types';

const SCHOOL_SETUP_FORM_ID = 'teacher-onboarding-school-setup';

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { updateSchool, createGrade, createSubject, createClass, bulkCreateStudents } =
    useTeacherOnboarding();
  const { grades, loading: gradesLoading, refetch: refetchGrades } = useGrades();
  const { classes, loading: classesLoading, refetch: refetchClasses } = useClasses();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdGrades, setCreatedGrades] = useState<Grade[]>([]);
  const [classByGradeId, setClassByGradeId] = useState<Record<string, string>>({});
  const [resumeChecked, setResumeChecked] = useState(false);

  // Step 2 state
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Step 3 state
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [csvText, setCsvText] = useState('');
  const [showCsv, setShowCsv] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schoolName = useMemo(() => {
    if (!user) return '';
    return `${user.firstName}'s Classroom`;
  }, [user]);

  const handleSchoolSetup = useCallback(async (data: SchoolSetupData) => {
    setIsLoading(true);
    try {
      await updateSchool({ name: data.name, type: data.type, province: data.province });
      toast.success('School details saved');
      setStep(2);
    } catch {
      toast.error('Failed to update school details');
    } finally {
      setIsLoading(false);
    }
  }, [updateSchool]);

  const handleGradesSubjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const newGrades: Grade[] = [];
      for (const name of selectedGrades) {
        const orderIndex = GRADE_LEVELS.indexOf(name as typeof GRADE_LEVELS[number]);
        const grade = await createGrade(name, orderIndex >= 0 ? orderIndex : 0);
        newGrades.push(grade);
      }

      const gradeIds = newGrades.map((g) => g.id);
      for (const name of selectedSubjects) {
        const code = name.substring(0, 3).toUpperCase();
        await createSubject(name, code, gradeIds);
      }

      const nextClassByGradeId: Record<string, string> = {};
      for (const grade of newGrades) {
        const cls = await createClass(`${grade.name} Class`, grade.id);
        nextClassByGradeId[grade.id] = cls.id;
      }

      setCreatedGrades(newGrades);
      setClassByGradeId(nextClassByGradeId);
      await refetchGrades();
      await refetchClasses();
      toast.success(`Created ${newGrades.length} grades, ${selectedSubjects.length} subjects, and ${newGrades.length} classes`);
      setStep(3);
    } catch {
      toast.error('Failed to create grades/subjects');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGrades, selectedSubjects, createClass, createGrade, createSubject, refetchClasses, refetchGrades]);

  const bulkCreateStudentsForSelectedGrades = useCallback(
    async (students: { firstName: string; lastName: string; gradeId: string }[]) => {
      const withClasses = students.map((student) => {
        const classId = classByGradeId[student.gradeId];
        if (!classId) {
          throw new Error(`No class found for grade ${student.gradeId}`);
        }
        return { ...student, classId };
      });
      return bulkCreateStudents(withClasses);
    },
    [bulkCreateStudents, classByGradeId],
  );

  const handleFinish = useCallback(() => {
    toast.success('Onboarding complete! Welcome to Campusly.');
    router.push('/teacher');
  }, [router]);

  const submitStudents = useCallback(async () => {
    if (pendingStudents.length === 0) {
      handleFinish();
      return;
    }
    setSubmitting(true);
    try {
      const payload = pendingStudents.map(({ firstName, lastName, gradeId }) => ({
        firstName, lastName, gradeId,
      }));
      const { created, failed, failures } = await bulkCreateStudentsForSelectedGrades(payload);
      if (created > 0) {
        toast.success(`${created} student(s) added successfully`);
      }
      if (failed > 0) {
        // Previously every student could 400 and the page still showed
        // "0 student(s) added successfully" before navigating away.
        toast.error(
          `${failed} student(s) could not be added. ${failures[0] ?? ''}`.trim(),
        );
        return;
      }
      handleFinish();
    } catch {
      toast.error('Failed to add students');
    } finally {
      setSubmitting(false);
    }
  }, [pendingStudents, bulkCreateStudentsForSelectedGrades, handleFinish]);

  useEffect(() => {
    if (resumeChecked || gradesLoading || classesLoading) return;

    const nextClassByGradeId = classes.reduce<Record<string, string>>((acc, cls) => {
      const gradeId = resolveId(cls.gradeId) || resolveId(cls.grade);
      const classId = resolveId(cls);
      if (gradeId && classId) acc[gradeId] = classId;
      return acc;
    }, {});

    setClassByGradeId(nextClassByGradeId);
    if (Object.keys(nextClassByGradeId).length > 0) {
      setStep(3);
    }
    setResumeChecked(true);
  }, [classes, classesLoading, gradesLoading, resumeChecked]);

  const allGrades = createdGrades.length > 0 ? createdGrades : grades;
  const stepLabels = ['School Setup', 'Grades & Subjects', 'Students'];
  const busy = isLoading || submitting;

  const footer = (() => {
    if (step === 1) {
      return {
        nextFormId: SCHOOL_SETUP_FORM_ID,
        nextLabel: isLoading ? 'Saving…' : 'Next: Add Grades & Subjects',
        nextLoading: isLoading,
        nextDisabled: isLoading,
      };
    }
    if (step === 2) {
      return {
        onNext: () => void handleGradesSubjects(),
        nextLabel: isLoading ? 'Creating grades & subjects…' : 'Next: Add Students',
        nextLoading: isLoading,
        nextDisabled: isLoading || selectedGrades.length === 0 || selectedSubjects.length === 0,
      };
    }
    return {
      onNext: () => void submitStudents(),
      nextLabel: busy
        ? 'Adding students…'
        : pendingStudents.length === 0
          ? 'Finish'
          : `Done — Add ${pendingStudents.length} Student${pendingStudents.length !== 1 ? 's' : ''}`,
      nextLoading: busy,
      nextDisabled: busy,
      isFinal: true,
      secondary: pendingStudents.length === 0
        ? undefined
        : {
            label: 'Skip — add students later',
            onClick: handleFinish,
            disabled: busy,
          },
    };
  })();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-12">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i + 1 <= step
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              <span className="hidden sm:inline text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[#2563EB] transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {step === 1 && (
          <SchoolSetupStep
            defaultName={schoolName}
            formId={SCHOOL_SETUP_FORM_ID}
            onNext={handleSchoolSetup}
          />
        )}
        {step === 2 && (
          <GradesSubjectsStep
            selectedGrades={selectedGrades}
            selectedSubjects={selectedSubjects}
            onGradesChange={setSelectedGrades}
            onSubjectsChange={setSelectedSubjects}
          />
        )}
        {step === 3 && (
          <AddStudentsStep
            grades={allGrades}
            pendingStudents={pendingStudents}
            onPendingChange={setPendingStudents}
            csvText={csvText}
            onCsvTextChange={setCsvText}
            showCsv={showCsv}
            onShowCsvToggle={() => setShowCsv((prev) => !prev)}
          />
        )}
      </div>

      <WizardFooter
        step={step}
        totalSteps={3}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        {...footer}
      />
    </div>
  );
}
